import type { VoiceModelProvider } from "../types/voice";
import {
  appendVoiceIOProviderRouterTraceEvent,
  applyVoiceProfileSwitchGuard,
  buildVoiceIOProviderRouterTraceEvent,
  buildVoiceObservabilityExportReplayReport,
  buildVoiceOpsRecoveryReport,
  buildVoiceProfileSwitchReadinessReport,
  buildVoiceProviderSloReport,
  createVoiceProofPackBuildContext,
  createVoiceProofRefreshSnapshot,
  createVoiceProofTraceStore,
  createVoiceProviderDecisionTraceEvent,
  createVoiceRoutingDecisionSummary,
  createVoiceScopedTraceEventStore,
  createVoiceTraceEvent,
  recommendVoiceProfileSwitch,
  runVoiceProviderRoutingContract,
  summarizeVoiceAssistantRuns,
  summarizeVoiceProviderHealth,
  summarizeVoiceTurnQuality,
  type StoredVoiceTraceEvent,
  type VoiceHandoffDeliveryStore,
  type VoiceProviderHealthSummary,
  voice,
} from "@absolutejs/voice";
import { createVoiceDrizzleObservabilityExportDeliveryReceiptStore } from "@absolutejs/voice/drizzle";
import { assemblyai } from "@absolutejs/voice-assemblyai";
import { deepgram } from "@absolutejs/voice-deepgram";
import { gemini } from "@absolutejs/voice-gemini";
import { openai } from "@absolutejs/voice-openai";
import { createVoiceIOProviderFailureSimulator } from "@absolutejs/voice/testing";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { db, postgresConnectionString } from "../../db/client";
import { deliveryRuntimeControl } from "./proofSeeds";
import {
  configuredModelProviders,
  configuredSTTProviders,
  configuredTTSProviders,
  deliveryTraceStore,
  modelProvider,
  queryFromContext,
  readQueryString,
  resolveVoiceProfileIdFromContext,
  sessionVoiceProfileIds,
  sttLatencyBudgets,
  ttsLatencyBudgets,
} from "./providers";
import {
  loadProofPackSloThresholdProfile,
  seedDemoRealCallProfileHistory,
} from "./readinessReports";
import {
  findVoiceProfileDefault,
  isMissingFileError,
  latestProofPackJsonPath,
  readRealCallProfileDefaultsReport,
} from "./realCallEvidence";
import {
  demoIncidentSessionId,
  handoffDeliveryStore,
  productionReadinessProofRuntime,
  productionReadinessTraceStore,
  runtimeDirectory,
  runtimeStorage,
} from "./stores";
import type { VoiceSTTProvider, VoiceTTSProvider } from "./providers";

const productionReadinessLinks = {
  agentSquadContracts: "/agent-squad-contract",
  auditDeliveries: "/audit/deliveries",
  bargeIn: "/barge-in",
  browserMedia: "/voice/browser-media",
  campaignReadiness: "/api/voice/campaigns/readiness-proof",
  carriers: "/carriers",
  deliveryRuntime: "/delivery-runtime",
  handoffs: "/handoffs",
  mediaPipeline: "/voice/media-pipeline",
  observabilityExport: "/voice/observability-export",
  observabilityExportDeliveries: "/api/voice/observability-export/deliveries",
  operationsRecords: "/voice-operations/:sessionId",
  opsActions: "/voice/ops-actions",
  opsRecovery: "/ops-recovery",
  profileSwitchLiveDecisions: "/voice/profile-switch-live-decisions",
  profileSwitchPolicy: "/voice/profile-switch-policy",
  profileSwitchReadiness: "/voice/profile-switch-readiness",
  proofTrends: "/voice/proof-trends",
  providerContracts: "/provider-contracts",
  providerOrchestration: "/voice/provider-orchestration",
  providerRoutingContracts: "/api/provider-routing-contract",
  providerSlo: "/voice/provider-slos",
  quality: "/quality",
  reconnectContracts: "/voice/reconnect-contract",
  resilience: "/resilience",
  sessions: "/sessions",
  sloReadinessThresholds: "/voice/slo-readiness-thresholds",
  telephonyWebhookSecurity: "/api/voice/telephony/webhook-security",
  traceDeliveries: "/traces/deliveries",
};

const telephonyWebhookSecurityOptions = () => ({
  plivo: {
    authToken: "proof-plivo-secret",
  },
  store: {
    connectionString: postgresConnectionString,
    kind: "postgres" as const,
  },
  telnyx: {
    publicKey: "proof-telnyx-public-key",
    toleranceSeconds: 300,
  },
  ttlSeconds: 300,
  twilio: {
    authToken: "proof-secret",
    verificationUrl: "https://voice.example.test/carrier",
  },
});

const opsRecoveryOptions = () => ({
  auditDeliveries: runtimeStorage.auditDeliveries,
  handoffDeliveries:
    handoffDeliveryStore as unknown as VoiceHandoffDeliveryStore,
  latency: {
    failAfterMs: 3_200,
    warnAfterMs: 1_800,
  },
  links: {
    auditDeliveries: "/audit/deliveries",
    handoffs: "/handoffs",
    providers: "/api/provider-status",
    traceDeliveries: "/traces/deliveries",
    operationsRecords: (sessionId: string) =>
      `/voice-operations/${encodeURIComponent(sessionId)}`,
    sessions: (sessionId: string) =>
      `/sessions/${encodeURIComponent(sessionId)}`,
    traces: (sessionId: string) => `/traces/${encodeURIComponent(sessionId)}`,
  },
  path: "/api/voice/ops-recovery",
  providers: [
    ...configuredModelProviders,
    ...configuredSTTProviders,
    ...configuredTTSProviders,
  ],
  traces: deliveryTraceStore,
});

const buildDemoOpsRecoveryReport = () =>
  buildVoiceOpsRecoveryReport(opsRecoveryOptions());

const buildProductionReadinessOpsRecoveryReport = () =>
  buildVoiceOpsRecoveryReport({
    ...opsRecoveryOptions(),
    auditDeliveries: undefined,
    traceDeliveries: undefined,
    traces: productionReadinessTraceStore,
  });

const providerSloProofScenarioId = "provider-slo-proof";

const providerSloProofTraceStore = createVoiceProofTraceStore({
  mirrorStore: deliveryTraceStore,
  scope: {
    scenarioId: providerSloProofScenarioId,
  },
});

const providerSloOptions = {
  maxAgeMs: 10 * 60 * 1000,
  requiredKinds: ["llm", "stt", "tts"] as const,
  scenarioId: providerSloProofScenarioId,
  thresholds: {
    llm: {
      maxAverageElapsedMs: 2_500,
      maxP95ElapsedMs: 4_500,
    },
    stt: {
      maxAverageElapsedMs: 800,
      maxP95ElapsedMs: 1_500,
    },
    tts: {
      maxAverageElapsedMs: 1_200,
      maxP95ElapsedMs: 2_200,
    },
  },
};

const seedDemoProviderSloProof = async () => {
  const now = Date.now();
  const sessionId = `provider-slo-proof-${now}`;
  const primaryModelProvider = configuredModelProviders[0] ?? "deterministic";
  const fallbackModelProvider =
    configuredModelProviders.find(
      (provider) => provider !== primaryModelProvider,
    ) ?? "anthropic";
  await Promise.all(
    (await providerSloProofTraceStore.list()).map((event) =>
      providerSloProofTraceStore.remove(event.id),
    ),
  );
  const proofEvents = [
    {
      elapsedMs: 700,
      fallbackProvider: fallbackModelProvider,
      kind: "llm",
      provider: primaryModelProvider,
      selectedProvider: fallbackModelProvider,
      status: "fallback",
    },
    {
      elapsedMs: 320,
      kind: "llm",
      provider: fallbackModelProvider,
      selectedProvider: fallbackModelProvider,
      status: "success",
    },
    {
      elapsedMs: 300,
      kind: "llm",
      provider: primaryModelProvider,
      selectedProvider: primaryModelProvider,
      status: "success",
    },
    {
      elapsedMs: 280,
      kind: "llm",
      provider: primaryModelProvider,
      selectedProvider: primaryModelProvider,
      status: "success",
    },
    {
      elapsedMs: 82,
      kind: "stt",
      provider: configuredSTTProviders[0] ?? "deepgram",
      status: "success",
    },
    {
      elapsedMs: 45,
      kind: "tts",
      provider: configuredTTSProviders[0] ?? "emergency",
      status: "success",
    },
  ].map((event, index) =>
    createVoiceTraceEvent({
      at: now + index,
      payload: {
        elapsedMs: event.elapsedMs,
        fallbackProvider: event.fallbackProvider,
        kind: event.kind,
        provider: event.provider,
        providerStatus: event.status,
        selectedProvider: event.selectedProvider ?? event.provider,
      },
      scenarioId: providerSloProofScenarioId,
      sessionId,
      type: "session.error",
    }),
  );
  const events: StoredVoiceTraceEvent[] = await Promise.all(
    proofEvents.map((event) => providerSloProofTraceStore.append(event)),
  );

  return {
    events: events.length,
    ok: true,
    scenarioId: providerSloProofScenarioId,
    sessionId,
  };
};

const providerDecisionProofScenarioId = "provider-decision-proof";

const seedDemoProviderDecisionProof = async () => {
  const now = Date.now();
  const sessionId = `provider-decision-proof-${now}`;
  const modelPrimary = configuredModelProviders[0] ?? "deterministic";
  const modelFallback =
    configuredModelProviders.find((provider) => provider !== modelPrimary) ??
    modelPrimary;
  const sttPrimary = configuredSTTProviders[0] ?? "deepgram";
  const sttFallback =
    configuredSTTProviders.find((provider) => provider !== sttPrimary) ??
    sttPrimary;
  const ttsPrimary = configuredTTSProviders[0] ?? "emergency";

  const events = await Promise.all(
    [
      createVoiceProviderDecisionTraceEvent({
        at: now,
        elapsedMs: 320,
        kind: "llm",
        provider: modelPrimary,
        reason:
          "live-call selected the lowest-latency configured model provider inside the orchestration policy.",
        scenarioId: providerDecisionProofScenarioId,
        selectedProvider: modelPrimary,
        sessionId,
        status: "selected",
        surface: "live-call",
      }),
      createVoiceProviderDecisionTraceEvent({
        at: now + 1,
        elapsedMs: 82,
        fallbackProvider: sttFallback,
        kind: "stt",
        provider: sttPrimary,
        reason:
          sttFallback === sttPrimary
            ? "live-stt used the only configured realtime STT provider."
            : "live-stt recovered by falling back to the next configured STT provider.",
        scenarioId: providerDecisionProofScenarioId,
        selectedProvider: sttFallback,
        sessionId,
        status: sttFallback === sttPrimary ? "selected" : "fallback",
        surface: "live-stt",
      }),
      createVoiceProviderDecisionTraceEvent({
        at: now + 2,
        elapsedMs: 45,
        kind: "tts",
        provider: ttsPrimary,
        reason:
          "telephony-tts selected the configured low-latency speech provider for phone playback.",
        scenarioId: providerDecisionProofScenarioId,
        selectedProvider: ttsPrimary,
        sessionId,
        status: "selected",
        surface: "telephony-tts",
      }),
      createVoiceProviderDecisionTraceEvent({
        at: now + 3,
        elapsedMs: 650,
        kind: "llm",
        provider: configuredModelProviders.includes("gemini")
          ? "gemini"
          : modelFallback,
        reason:
          "background-summary selected the lower-cost summarization lane instead of the live-call latency lane.",
        scenarioId: providerDecisionProofScenarioId,
        selectedProvider: configuredModelProviders.includes("gemini")
          ? "gemini"
          : modelFallback,
        sessionId,
        status: "selected",
        surface: "background-summary",
      }),
      createVoiceProviderDecisionTraceEvent({
        at: now + 4,
        elapsedMs: 720,
        fallbackProvider: modelFallback,
        kind: "llm",
        provider: modelPrimary,
        reason:
          "live-call recovered by falling back to the next configured model provider after a simulated primary provider timeout.",
        scenarioId: providerDecisionProofScenarioId,
        selectedProvider: modelFallback,
        sessionId,
        status: "fallback",
        surface: "live-call",
      }),
      createVoiceProviderDecisionTraceEvent({
        at: now + 5,
        elapsedMs: 980,
        fallbackProvider: "deterministic",
        kind: "llm",
        provider: modelPrimary,
        reason:
          "live-call degraded to deterministic fallback after model providers exceeded the latency budget.",
        scenarioId: providerDecisionProofScenarioId,
        selectedProvider: "deterministic",
        sessionId,
        status: "degraded",
        surface: "live-call",
      }),
    ].map((event) => deliveryTraceStore.append(event)),
  );

  return {
    events: events.length,
    ok: true,
    scenarioId: providerDecisionProofScenarioId,
    sessionId,
  };
};

const observabilityExportDeliveryDestinations = () => [
  {
    directory: resolve(runtimeDirectory, "observability-exports"),
    kind: "file" as const,
    label: "Local customer-owned observability archive",
  },
  ...(process.env.VOICE_OBSERVABILITY_EXPORT_S3_BUCKET
    ? [
        {
          bucket: process.env.VOICE_OBSERVABILITY_EXPORT_S3_BUCKET,
          keyPrefix:
            process.env.VOICE_OBSERVABILITY_EXPORT_S3_PREFIX ??
            "absolutejs-voice-demo",
          kind: "s3" as const,
          label: "S3 customer-owned observability archive",
        },
      ]
    : []),
  ...(process.env.VOICE_OBSERVABILITY_EXPORT_SQLITE_PATH
    ? [
        {
          kind: "sqlite" as const,
          label: "SQLite customer-owned observability warehouse",
          path: process.env.VOICE_OBSERVABILITY_EXPORT_SQLITE_PATH,
          tableName:
            process.env.VOICE_OBSERVABILITY_EXPORT_SQLITE_TABLE ??
            "voice_observability_exports",
        },
      ]
    : []),
  ...(process.env.VOICE_OBSERVABILITY_EXPORT_POSTGRES_URL
    ? [
        {
          connectionString: process.env.VOICE_OBSERVABILITY_EXPORT_POSTGRES_URL,
          kind: "postgres" as const,
          label: "Postgres customer-owned observability warehouse",
          schemaName:
            process.env.VOICE_OBSERVABILITY_EXPORT_POSTGRES_SCHEMA ?? "voice",
          tableName:
            process.env.VOICE_OBSERVABILITY_EXPORT_POSTGRES_TABLE ??
            "observability_exports",
        },
      ]
    : []),
];

const observabilityExportDeliveryReceipts =
  createVoiceDrizzleObservabilityExportDeliveryReceiptStore({ db });

const cleanupDemoQualityNoise = async () => {
  const traces = await runtimeStorage.traces.list();
  const staleSyntheticProviderErrors = traces.filter(
    (trace) =>
      trace.type === "session.error" &&
      trace.payload.providerStatus === "error" &&
      /^(phone-|provider-sim-|provider-slo-proof-|stt-sim-|tts-sim-)/.test(
        trace.sessionId,
      ),
  );

  await Promise.all(
    staleSyntheticProviderErrors.map((trace) =>
      runtimeStorage.traces.remove(trace.id),
    ),
  );

  const existingRoutingProof = traces.filter(
    (trace) => trace.sessionId === "quality-routing-proof",
  );
  await Promise.all(
    existingRoutingProof.map((trace) => runtimeStorage.traces.remove(trace.id)),
  );

  const staleFailedExportReceipts =
    await observabilityExportDeliveryReceipts.list();
  await Promise.all(
    staleFailedExportReceipts
      .filter(
        (receipt) =>
          receipt.status === "fail" || receipt.exportStatus === "fail",
      )
      .map((receipt) => observabilityExportDeliveryReceipts.remove(receipt.id)),
  );

  await deliveryTraceStore.append({
    at: Date.now(),
    payload: {
      elapsedMs: 35,
      kind: "llm",
      provider: modelProvider,
      providerStatus: "success",
      selectedProvider: modelProvider,
      status: "success",
    },
    scenarioId: "quality-routing-proof",
    sessionId: "quality-routing-proof",
    type: "session.error",
  });
};

const proofArtifact = (input: {
  id: string;
  kind: "proof-pack";
  label: string;
  path: string;
}) => {
  const exists = existsSync(input.path);

  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    path: input.path,
    required: false,
    status: exists ? ("pass" as const) : ("warn" as const),
  };
};

const proofScreenshotArtifact = (id: string, label: string, file: string) => {
  const path = resolve(runtimeDirectory, "proof-pack/screenshots/latest", file);
  const maxScreenshotAgeMs = 2 * 60 * 60 * 1000;
  const isFresh =
    existsSync(path) &&
    Date.now() - statSync(path).mtimeMs <= maxScreenshotAgeMs;

  return isFresh
    ? [
        {
          id,
          kind: "screenshot" as const,
          label,
          path,
          status: "pass" as const,
        },
      ]
    : [];
};

const readLatestDemoVoiceProofPackFile = async () => {
  const file = Bun.file(latestProofPackJsonPath);
  if (!(await file.exists())) {
    throw new Error(`Missing ${latestProofPackJsonPath}`);
  }

  return (await file.json()) as Record<string, unknown>;
};

const productionReadinessAuditStore = {
  ...runtimeStorage.audit,
  list: async (filter?: Parameters<typeof runtimeStorage.audit.list>[0]) => {
    const events = await runtimeStorage.audit.list({
      ...filter,
      limit: Math.min(filter?.limit ?? 100, 100),
    });

    return events.slice(-100);
  },
};

const buildProofPackProviderSloReport = async (
  input: {
    context?: ReturnType<typeof createVoiceProofPackBuildContext>;
    snapshot?: Awaited<ReturnType<typeof createVoiceProofRefreshSnapshot>>;
  } = {},
) => {
  const thresholdProfile = await loadProofPackSloThresholdProfile(
    input.context,
  );

  return buildVoiceProviderSloReport({
    ...providerSloOptions,
    store: createVoiceScopedTraceEventStore(
      input.snapshot?.traceStore ?? providerSloProofTraceStore,
      {
        scenarioId: providerSloProofScenarioId,
      },
    ),
    thresholds: {
      ...providerSloOptions.thresholds,
      ...thresholdProfile.providerSlo,
    },
  });
};

const refreshFastProductionReadinessProof = () =>
  productionReadinessProofRuntime.refresh(async () => {
    await Promise.all([
      productionReadinessProofRuntime.seedTraceProof({
        llmProvider: configuredModelProviders[0] ?? "openai",
        scenarioId: providerSloProofScenarioId,
        sttProvider: configuredSTTProviders[0] ?? "deepgram",
        ttsProvider: configuredTTSProviders[0] ?? "openai",
      }),
      seedDemoRealCallProfileHistory(),
    ]);
  });

const summarizeProductionReadinessDeliveryRuntime = () =>
  productionReadinessProofRuntime.cache("delivery-runtime", () =>
    deliveryRuntimeControl.summarize(),
  );

const timeReadinessResolver = async <T>(
  label: string,
  run: () => Promise<T> | T,
) => {
  const startedAt = Date.now();
  try {
    return await run();
  } finally {
    if (process.env.VOICE_READINESS_DEBUG_TIMINGS === "1") {
      console.log(`[readiness] ${label}: ${Date.now() - startedAt}ms`);
    }
  }
};

const buildDemoObservabilityExportReplay = async () => {
  const latestReceipt = (await observabilityExportDeliveryReceipts.list()).find(
    (receipt) =>
      receipt.status === "pass" &&
      receipt.exportStatus === "pass" &&
      receipt.summary.delivered > 0,
  );

  if (!latestReceipt) {
    return buildVoiceObservabilityExportReplayReport({});
  }

  const sqliteDestination = latestReceipt.destinations.find(
    (destination) =>
      destination.status === "delivered" &&
      destination.destinationKind === "sqlite",
  );

  if (sqliteDestination && process.env.VOICE_OBSERVABILITY_EXPORT_SQLITE_PATH) {
    return {
      kind: "sqlite" as const,
      path: process.env.VOICE_OBSERVABILITY_EXPORT_SQLITE_PATH,
      runId: latestReceipt.runId,
      tableName:
        process.env.VOICE_OBSERVABILITY_EXPORT_SQLITE_TABLE ??
        "voice_observability_exports",
    };
  }

  return {
    directory: resolve(runtimeDirectory, "observability-exports"),
    kind: "file" as const,
    receiptDirectory: resolve(
      runtimeDirectory,
      "observability-export-receipts",
    ),
    runId: latestReceipt.runId,
  };
};

type DemoProofSurface = {
  detail: string;
  href: string;
  label: string;
  status: "empty" | "fail" | "pass" | "warn";
};

const getDemoProofStatus = (surfaces: DemoProofSurface[]) =>
  surfaces.some((surface) => surface.status === "fail")
    ? "fail"
    : surfaces.some(
          (surface) => surface.status === "warn" || surface.status === "empty",
        )
      ? "warn"
      : "pass";

const listDemoProofTracesSafely = async () => {
  try {
    return await runtimeStorage.traces.list({ limit: 50 });
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      return await runtimeStorage.traces.list({ limit: 50 });
    } catch (retryError) {
      if (isMissingFileError(retryError)) {
        return [];
      }
      throw retryError;
    }
  }
};

const renderDemoProofHTML = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AbsoluteJS Voice Demo Proof</title>
    <style>
      body{background:#0a0f14;color:#f7f3e8;font-family:ui-sans-serif,system-ui,sans-serif;margin:0}
      main{margin:auto;max-width:1120px;padding:32px}
      .hero,.surface{background:#111821;border:1px solid #26313d;border-radius:24px;margin-bottom:16px;padding:22px}
      .hero{background:linear-gradient(135deg,rgba(94,234,212,.16),rgba(245,158,11,.1))}
      .eyebrow{color:#5eead4;font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      h1{font-size:clamp(2.4rem,7vw,5.5rem);line-height:.9;margin:.2rem 0 1rem}
      button,.link{background:#5eead4;border:0;border-radius:999px;color:#061014;cursor:pointer;display:inline-flex;font-weight:900;margin:8px 8px 0 0;padding:11px 15px;text-decoration:none}
      .link{background:#1b2530;color:#d7fff8}
      .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
      .surface.pass{border-color:rgba(34,197,94,.5)}.surface.warn,.surface.empty{border-color:rgba(245,158,11,.55)}.surface.fail{border-color:rgba(248,113,113,.65)}
      .surface header{align-items:start;display:flex;gap:12px;justify-content:space-between}
      .surface strong{font-size:1.05rem}.status{border:1px solid #334155;border-radius:999px;padding:5px 9px}.pass .status{color:#86efac}.warn .status,.empty .status{color:#fde68a}.fail .status{color:#fca5a5}
      .muted{color:#b7c0ca;line-height:1.5}pre{background:#080b10;border:1px solid #26313d;border-radius:16px;color:#d7fff8;overflow:auto;padding:14px}
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="eyebrow">Self-hosted production proof</p>
        <h1>Run the full voice proof suite</h1>
        <p class="muted">One action seeds deterministic demo evidence, runs carrier proof, refreshes delivery workers, and returns the same proof surfaces users can inspect individually.</p>
        <button id="run-proof" type="button">Run full proof suite</button>
        <a class="link" href="/production-readiness">Open readiness</a>
        <a class="link" href="/voice/proof-trends">Open sustained trends</a>
        <a class="link" href="/voice-operations/${demoIncidentSessionId}">Open operations record</a>
        <a class="link" href="/voice-incidents/${demoIncidentSessionId}/markdown">Export incident bundle</a>
        <a class="link" href="/">Back to demo</a>
      </section>
      <section id="proof-output" class="grid">
        <article class="surface empty"><header><strong>No proof run yet</strong><span class="status">empty</span></header><p class="muted">Click the button to run barge-in, live latency, turn waterfall, provider, delivery, carrier, trace, and readiness proof.</p></article>
      </section>
      <pre id="proof-json"></pre>
    </main>
    <script>
      const output = document.getElementById("proof-output");
      const json = document.getElementById("proof-json");
      document.getElementById("run-proof").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = "Running proof...";
        try {
          const response = await fetch("/api/demo-proof", { method: "POST" });
          const report = await response.json();
          output.innerHTML = report.surfaces.map((surface) => \`
            <article class="surface \${surface.status}">
              <header><strong>\${surface.label}</strong><span class="status">\${surface.status}</span></header>
              <p class="muted">\${surface.detail}</p>
              <a class="link" href="\${surface.href}">Open surface</a>
            </article>
          \`).join("");
          json.textContent = JSON.stringify(report, null, 2);
        } catch (error) {
          output.innerHTML = '<article class="surface fail"><header><strong>Proof failed</strong><span class="status">fail</span></header><p class="muted">' + String(error?.message ?? error) + '</p></article>';
        } finally {
          button.disabled = false;
          button.textContent = "Run full proof suite";
        }
      });
    </script>
  </body>
</html>`;

const summarizeAssistantRuns = async () =>
  summarizeVoiceAssistantRuns({ store: deliveryTraceStore });

const summarizeProviderHealth = async (): Promise<
  VoiceProviderHealthSummary<VoiceModelProvider>[]
> =>
  summarizeVoiceProviderHealth({
    providers: configuredModelProviders,
    store: deliveryTraceStore,
  });

const getLatestRoutingDecision = async () => {
  const decision = await createVoiceRoutingDecisionSummary({
    kind: "stt",
    store: deliveryTraceStore,
  });
  if (!decision) {
    return decision;
  }

  const profileId =
    sessionVoiceProfileIds.get(decision.sessionId) ?? "meeting-recorder";
  const profile = await findVoiceProfileDefault(profileId);

  return {
    ...decision,
    profileId: profile?.profileId ?? profileId,
    profileLabel: profile?.label,
    providerRoutes: profile?.providerRoutes,
  };
};

const getRecentTurnQualitySignals = async () => {
  const turnQuality = await summarizeVoiceTurnQuality({
    limit: 25,
    store: runtimeStorage.session,
  });
  const turnLatencies = turnQuality.turns
    .map((turn) => turn.latencyMs)
    .filter((value): value is number => typeof value === "number");
  const turnP95Ms =
    turnLatencies.length > 0
      ? turnLatencies.sort((left, right) => left - right)[
          Math.max(0, Math.ceil(turnLatencies.length * 0.95) - 1)
        ]
      : undefined;

  return {
    turnP95Ms,
    turnWarnings: turnQuality.warnings,
  };
};

const getProfileSwitchInputs = async () => {
  const [defaults, decision, turnQuality] = await Promise.all([
    readRealCallProfileDefaultsReport(),
    getLatestRoutingDecision(),
    getRecentTurnQualitySignals(),
  ]);

  return {
    decision,
    defaults,
    observed: {
      currentProfileId: decision?.profileId ?? "meeting-recorder",
      fallbackUsed: Boolean(decision?.fallbackProvider),
      providerP95Ms: decision?.elapsedMs,
      turnP95Ms: turnQuality.turnP95Ms,
      turnWarnings: turnQuality.turnWarnings,
    },
  };
};

const getProfileSwitchRecommendation = async () => {
  const { defaults, observed } = await getProfileSwitchInputs();

  return recommendVoiceProfileSwitch({
    defaults,
    observed,
  });
};

const demoVoiceProfileIds = [
  "meeting-recorder",
  "support-agent",
  "appointment-scheduler",
  "noisy-phone-call",
] as const;

const buildProductionReadinessProfileSwitchReport = () =>
  productionReadinessProofRuntime.cache("profile-switch-readiness", () =>
    buildVoiceProfileSwitchReadinessReport({
      audit: runtimeStorage.audit,
      autoMode: true,
      limit: 50,
      maxAutoAppliedRatio: 1,
      policyProof: {
        allowedProfileIds: [...demoVoiceProfileIds],
        audit: runtimeStorage.audit,
        metadata: {
          source: "absolutejs-voice-example",
        },
        observed: {
          currentProfileId: "meeting-recorder",
          fallbackUsed: true,
          providerP95Ms: 950,
          turnWarnings: 3,
        },
        defaults: () => readRealCallProfileDefaultsReport(),
      },
      trace: deliveryTraceStore,
    }),
  );

const readQueryNumber = (
  query: Record<PropertyKey, unknown> | undefined,
  keys: readonly string[],
  fallback: number,
) => {
  const value = Number(readQueryString(query, keys) ?? fallback);

  return Number.isFinite(value) ? value : fallback;
};

const readQueryList = (
  query: Record<PropertyKey, unknown> | undefined,
  keys: readonly string[],
) =>
  readQueryString(query, keys)
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const readProfileSwitchGuardMode = (
  query: Record<PropertyKey, unknown> | undefined,
) => {
  const mode = readQueryString(query, ["profileSwitchMode", "mode"]);

  return mode === "off" || mode === "recommend" || mode === "auto"
    ? mode
    : "auto";
};

const runProfileSwitchGuard = async (
  query: Record<string, string | undefined>,
) => {
  const { defaults, decision, observed } = await getProfileSwitchInputs();
  const minConfidence = readQueryNumber(query, ["minConfidence"], 0.75);

  return await applyVoiceProfileSwitchGuard({
    actor: {
      id: "absolutejs-voice-example",
      kind: "system",
      name: "AbsoluteJS Voice Example",
    },
    allowedProfileIds: readQueryList(query, [
      "allowedProfiles",
      "allowedProfileIds",
    ]) ?? [...demoVoiceProfileIds],
    audit: runtimeStorage.audit,
    blockedProfileIds: readQueryList(query, [
      "blockedProfiles",
      "blockedProfileIds",
    ]),
    defaults,
    maxAutoSwitchesPerSession: readQueryNumber(
      query,
      ["maxAutoSwitchesPerSession", "maxProfileSwitches"],
      1,
    ),
    metadata: {
      endpoint: "/api/voice/profile-switch-guard",
      selectedBy: "demo-user",
    },
    minConfidence,
    mode: readProfileSwitchGuardMode(query),
    observed,
    sessionId: decision?.sessionId,
  });
};

const createDemoProfileSwitchGuard = (endpoint: string) => ({
  actor: {
    id: "absolutejs-voice-example",
    kind: "system" as const,
    name: "AbsoluteJS Voice Example",
  },
  allowedProfileIds: [...demoVoiceProfileIds],
  audit: runtimeStorage.audit,
  trace: deliveryTraceStore,
  blockedProfileIds: ({ context }: { context: unknown }) =>
    readQueryList(queryFromContext(context), [
      "blockedProfiles",
      "blockedProfileIds",
    ]),
  currentProfileId: ({ context }: { context: unknown }) =>
    resolveVoiceProfileIdFromContext(context),
  defaults: () => readRealCallProfileDefaultsReport(),
  maxAutoSwitchesPerSession: ({ context }: { context: unknown }) =>
    readQueryNumber(
      queryFromContext(context),
      ["maxAutoSwitchesPerSession", "maxProfileSwitches"],
      1,
    ),
  metadata: ({ context }: { context: unknown }) => ({
    endpoint,
    requestedProfileId: resolveVoiceProfileIdFromContext(context),
    selectedBy: "session-start",
  }),
  minConfidence: ({ context }: { context: unknown }) =>
    readQueryNumber(queryFromContext(context), ["minProfileConfidence"], 0.75),
  mode: ({ context }: { context: unknown }) =>
    readProfileSwitchGuardMode(queryFromContext(context)),
  observed: async ({ context }: { context: unknown }) => {
    const quality = await getRecentTurnQualitySignals();

    return {
      currentProfileId: resolveVoiceProfileIdFromContext(context),
      turnP95Ms: quality.turnP95Ms,
      turnWarnings: quality.turnWarnings,
    };
  },
  onDecision: ({
    context,
    decision,
    sessionId,
  }: {
    context: unknown;
    decision: Awaited<ReturnType<typeof applyVoiceProfileSwitchGuard>>;
    sessionId: string;
  }) => {
    sessionVoiceProfileIds.set(
      sessionId,
      decision.selectedProfileId ?? resolveVoiceProfileIdFromContext(context),
    );
  },
});

const sttProviderSimulationStatus = () =>
  (["deepgram", "assemblyai"] as const).map((provider) => ({
    configured: configuredSTTProviders.includes(provider),
    provider,
  }));

const sttProviderFailureSimulator =
  createVoiceIOProviderFailureSimulator<VoiceSTTProvider>({
    failureElapsedMs: 12,
    kind: "stt",
    latencyBudgets: sttLatencyBudgets,
    providers: configuredSTTProviders,
    recoveryElapsedMs: {
      assemblyai: 28,
      deepgram: 18,
    },
    failureMessage: ({ provider }) =>
      `Simulated ${provider} websocket open failure.`,
    fallback: (provider) =>
      configuredSTTProviders.filter((candidate) => candidate !== provider),
    onProviderEvent: async (event, input) => {
      await appendVoiceIOProviderRouterTraceEvent({
        event,
        sessionId: input.sessionId,
        store: deliveryTraceStore,
      });
    },
    sessionId: ({ now }) => `stt-sim-${now}`,
  });

const runDemoSTTProviderRoutingContract = async () => {
  const events: StoredVoiceTraceEvent[] = [];
  const requestedProvider: VoiceSTTProvider = configuredSTTProviders.includes(
    "deepgram",
  )
    ? "deepgram"
    : (configuredSTTProviders[0] ?? "deepgram");
  const fallbackProvider = configuredSTTProviders.find(
    (provider) => provider !== requestedProvider,
  );
  const simulator = createVoiceIOProviderFailureSimulator<VoiceSTTProvider>({
    failureElapsedMs: 12,
    kind: "stt",
    latencyBudgets: sttLatencyBudgets,
    providers: configuredSTTProviders,
    recoveryElapsedMs: {
      assemblyai: 28,
      deepgram: 18,
    },
    failureMessage: ({ provider }) =>
      `Simulated ${provider} websocket open failure.`,
    fallback: (provider) =>
      configuredSTTProviders.filter((candidate) => candidate !== provider),
    onProviderEvent: async (event, input) => {
      events.push(
        buildVoiceIOProviderRouterTraceEvent({
          event,
          id: `${input.sessionId}:${event.provider}:${event.status}:${event.at}`,
          scenarioId: "stt-provider-routing-contract",
          sessionId: input.sessionId,
        }),
      );
    },
    sessionId: ({ now }) => `stt-contract-${now}`,
  });

  await simulator.run(
    requestedProvider,
    fallbackProvider ? "failure" : "recovery",
  );

  return runVoiceProviderRoutingContract({
    contract: {
      expect: fallbackProvider
        ? [
            {
              fallbackProvider,
              kind: "stt",
              operation: "open",
              provider: requestedProvider,
              selectedProvider: requestedProvider,
              status: "error",
            },
            {
              fallbackProvider,
              kind: "stt",
              operation: "open",
              provider: fallbackProvider,
              selectedProvider: requestedProvider,
              status: "fallback",
            },
          ]
        : [
            {
              kind: "stt",
              operation: "open",
              provider: requestedProvider,
              selectedProvider: requestedProvider,
              status: "success",
            },
          ],
      id: fallbackProvider
        ? `${requestedProvider}-to-${fallbackProvider}-stt-fallback`
        : `${requestedProvider}-stt-success`,
      label: "Demo STT provider fallback",
      scenarioId: "stt-provider-routing-contract",
    },
    events,
  });
};

const runDemoTTSProviderRoutingContract = async () => {
  const events: StoredVoiceTraceEvent[] = [];
  const requestedProvider: VoiceTTSProvider = configuredTTSProviders.includes(
    "openai",
  )
    ? "openai"
    : (configuredTTSProviders[0] ?? "emergency");
  const fallbackProvider = configuredTTSProviders.find(
    (provider) => provider !== requestedProvider,
  );
  const simulator = createVoiceIOProviderFailureSimulator<VoiceTTSProvider>({
    failureElapsedMs: 18,
    kind: "tts",
    latencyBudgets: ttsLatencyBudgets,
    providers: configuredTTSProviders,
    recoveryElapsedMs: {
      emergency: 8,
      openai: 45,
    },
    failureMessage: ({ provider }) =>
      `Simulated ${provider} speech synthesis open failure.`,
    fallback: (provider) =>
      configuredTTSProviders.filter((candidate) => candidate !== provider),
    onProviderEvent: async (event, input) => {
      events.push(
        buildVoiceIOProviderRouterTraceEvent({
          event,
          id: `${input.sessionId}:${event.provider}:${event.status}:${event.at}`,
          scenarioId: "tts-provider-routing-contract",
          sessionId: input.sessionId,
        }),
      );
    },
    sessionId: ({ now }) => `tts-contract-${now}`,
  });

  await simulator.run(
    requestedProvider,
    fallbackProvider ? "failure" : "recovery",
  );

  return runVoiceProviderRoutingContract({
    contract: {
      expect: fallbackProvider
        ? [
            {
              fallbackProvider,
              kind: "tts",
              operation: "open",
              provider: requestedProvider,
              selectedProvider: requestedProvider,
              status: "error",
            },
            {
              fallbackProvider,
              kind: "tts",
              operation: "open",
              provider: fallbackProvider,
              selectedProvider: requestedProvider,
              status: "fallback",
            },
          ]
        : [
            {
              kind: "tts",
              operation: "open",
              provider: requestedProvider,
              selectedProvider: requestedProvider,
              status: "success",
            },
          ],
      id: fallbackProvider
        ? `${requestedProvider}-to-${fallbackProvider}-tts-fallback`
        : `${requestedProvider}-tts-success`,
      label: "Demo TTS provider fallback",
      scenarioId: "tts-provider-routing-contract",
    },
    events,
  });
};

export {
  buildDemoObservabilityExportReplay,
  buildDemoOpsRecoveryReport,
  buildProductionReadinessOpsRecoveryReport,
  buildProductionReadinessProfileSwitchReport,
  buildProofPackProviderSloReport,
  cleanupDemoQualityNoise,
  createDemoProfileSwitchGuard,
  demoVoiceProfileIds,
  getDemoProofStatus,
  getLatestRoutingDecision,
  getProfileSwitchRecommendation,
  listDemoProofTracesSafely,
  observabilityExportDeliveryDestinations,
  observabilityExportDeliveryReceipts,
  opsRecoveryOptions,
  productionReadinessAuditStore,
  productionReadinessLinks,
  proofArtifact,
  proofScreenshotArtifact,
  providerSloOptions,
  providerSloProofScenarioId,
  providerSloProofTraceStore,
  readLatestDemoVoiceProofPackFile,
  refreshFastProductionReadinessProof,
  renderDemoProofHTML,
  runDemoSTTProviderRoutingContract,
  runDemoTTSProviderRoutingContract,
  runProfileSwitchGuard,
  seedDemoProviderDecisionProof,
  seedDemoProviderSloProof,
  sttProviderFailureSimulator,
  sttProviderSimulationStatus,
  summarizeAssistantRuns,
  summarizeProductionReadinessDeliveryRuntime,
  summarizeProviderHealth,
  telephonyWebhookSecurityOptions,
  timeReadinessResolver,
};
export type { DemoProofSurface };
