import {
  appendVoiceRealCallProfileRecoveryEvidence,
  buildVoicePlatformCoverageSummary,
  buildVoicePostCallAnalysisReport,
  buildVoiceProofTrendReportFromRealCallProfiles,
  buildVoiceRealCallProfileReadinessCheck,
  buildVoiceReconnectProfileEvidenceSummary,
  createVoiceProofPackBuildContext,
  createVoiceSloThresholdProfile,
  evaluateVoiceBrowserCallProfileEvidence,
  formatVoiceProofTrendAge,
  summarizeVoiceProviderFallbackRecovery,
  type VoicePlatformCoverageSurface,
  type VoicePostCallAnalysisOptions,
  type VoiceProductionReadinessCheck,
  type VoiceProofTrendRealCallProfileEvidence,
  type VoiceProofTrendReport,
  type VoiceProofTrendSummary,
  type VoiceSloCalibrationSample,
  voice,
} from "@absolutejs/voice";
import { deepgram } from "@absolutejs/voice-deepgram";
import { openai } from "@absolutejs/voice-openai";
import { renderVoiceReconnectProfileEvidenceHTML } from "@absolutejs/voice/client";
import { mkdir, readdir } from "node:fs/promises";
import { dirname } from "node:path";
import { escapeHtml } from "./helpers";
import {
  configuredModelProviders,
  configuredSTTProviders,
  configuredTTSProviders,
  deliveryTraceStore,
  modelProvider,
} from "./providers";
import {
  browserCallProfilesMaxAgeMs,
  latestProofPackJsonPath,
  latestProofTrendsJsonPath,
  longProofWindowRoot,
  proofTrendsMaxAgeMs,
  readLatestBrowserCallProfiles,
  readLatestProofTrends,
  readRealCallProfileDefaultsReport,
  realCallProfileEvidenceStore,
  realCallProfileRecoveryJobStore,
  realCallProfilesRoot,
  sloCalibrationMinRuns,
} from "./realCallEvidence";
import { demoIncidentSessionId, runtimeStorage } from "./stores";
import type {
  VapiCoverageResult,
  VapiCoverageSummary,
} from "./realCallEvidence";

const readReconnectProfileEvidenceSummary = async () =>
  buildVoiceReconnectProfileEvidenceSummary(
    await realCallProfileEvidenceStore.list({
      limit: 100,
      profileId: "reconnect-resume",
    }),
    {
      sourceHref: "/api/voice/real-call-profile-history",
    },
  );

const renderReconnectProfileEvidenceCardHTML = async () =>
  renderVoiceReconnectProfileEvidenceHTML(
    {
      error: null,
      isLoading: false,
      report: await readReconnectProfileEvidenceSummary(),
    },
    {
      description:
        "Real browser reconnect/resume traces captured by the demo UI.",
    },
  )
    .replace(
      "<section ",
      '<section hx-get="/voice/reconnect-profile-evidence-card" hx-trigger="every 10s" hx-swap="outerHTML" ',
    )
    .replace(
      'class="absolute-voice-reconnect-evidence',
      'class="voice-card voice-provider-health-card absolute-voice-reconnect-evidence',
    );

const seedDemoRealCallProfileHistory = async () => {
  const now = Date.now();
  const modelProvider = configuredModelProviders[0] ?? "openai";
  const sttProvider = configuredSTTProviders[0] ?? "deepgram";
  const ttsProvider = configuredTTSProviders[0] ?? "openai";
  const profiles = [
    {
      id: "meeting-recorder",
      label: "Meeting recorder",
      liveP95Ms: 420,
      providerP95Ms: 640,
      turnP95Ms: 620,
    },
    {
      id: "support-agent",
      label: "Support agent",
      liveP95Ms: 380,
      providerP95Ms: 590,
      turnP95Ms: 560,
    },
  ];
  const evidence: VoiceProofTrendRealCallProfileEvidence[] = profiles.map(
    (profile, index) => ({
      generatedAt: new Date(now + index).toISOString(),
      liveP95Ms: profile.liveP95Ms,
      ok: true,
      profileId: profile.id,
      profileLabel: profile.label,
      providerP95Ms: profile.providerP95Ms,
      providers: [
        {
          averageMs: profile.providerP95Ms,
          id: modelProvider,
          label: modelProvider,
          p95Ms: profile.providerP95Ms,
          role: "llm",
          samples: 6,
          status: "pass",
        },
        {
          averageMs: 90,
          id: sttProvider,
          label: sttProvider,
          p95Ms: 120,
          role: "stt",
          samples: 6,
          status: "pass",
        },
        {
          averageMs: 120,
          id: ttsProvider,
          label: ttsProvider,
          p95Ms: 160,
          role: "tts",
          samples: 6,
          status: "pass",
        },
      ],
      runtimeChannel: {
        maxBackpressureEvents: 0,
        maxFirstAudioLatencyMs: profile.liveP95Ms,
        maxInterruptionP95Ms: 140,
        maxJitterMs: 8,
        maxTimestampDriftMs: 90,
      },
      sessionId: `demo-real-call-profile-${profile.id}-${now}`,
      surfaces: ["browser", "live"],
      turnP95Ms: profile.turnP95Ms,
    }),
  );
  const report = buildVoiceProofTrendReportFromRealCallProfiles({
    evidence,
    generatedAt: new Date(now).toISOString(),
    maxAgeMs: proofTrendsMaxAgeMs,
    outputDir: realCallProfilesRoot,
    runId: `demo-real-call-profiles-${now}`,
    source: `${realCallProfilesRoot}/demo-seeded/real-call-profiles.json`,
  });
  const outputPath = `${realCallProfilesRoot}/demo-seeded/real-call-profiles.json`;

  await mkdir(dirname(outputPath), { recursive: true });
  await Bun.write(outputPath, JSON.stringify(report, null, 2));
  await Promise.all(
    profiles.flatMap((profile, index) => [
      appendVoiceRealCallProfileRecoveryEvidence({
        at: now + index * 10,
        browser: {
          firstAudioLatencyMs: profile.liveP95Ms,
          messageCount: 12,
          openSockets: 1,
          receivedBytes: 24_000,
          sentBytes: 18_000,
        },
        live: { latencyMs: profile.liveP95Ms },
        profileId: profile.id,
        providers: {
          llm: modelProvider,
          stt: sttProvider,
          tts: ttsProvider,
        },
        sessionId: `demo-real-call-profile-${profile.id}-${now}`,
        store: deliveryTraceStore,
      }),
    ]),
  );
  const job = await realCallProfileRecoveryJobStore.create({
    actionId: "refresh",
    createdAt: new Date(now).toISOString(),
    message: "Seeded demo real-call profile proof history.",
    status: "queued",
  });
  await realCallProfileRecoveryJobStore.update(job.id, {
    completedAt: new Date(now + profiles.length * 10).toISOString(),
    message: "Demo real-call profile proof history is passing.",
    ok: true,
    status: "pass",
    updatedAt: new Date(now + profiles.length * 10).toISOString(),
  });

  return report;
};

const buildBrowserCallProfileReadinessCheck =
  async (): Promise<VoiceProductionReadinessCheck> => {
    const report = await readLatestBrowserCallProfiles();
    const assertion = evaluateVoiceBrowserCallProfileEvidence(report, {
      maxAgeMs: browserCallProfilesMaxAgeMs,
      minOpenSocketsPerFramework: 1,
      minSentBytesPerFramework: 1,
      requiredFrameworks: ["react", "vue", "svelte", "angular", "html", "htmx"],
    });

    return {
      detail: assertion.ok
        ? `${assertion.passedFrameworks.length}/6 framework demos opened voice WebSockets and sent microphone audio bytes.`
        : assertion.issues.join(" "),
      gateExplanation: {
        evidenceHref: "/voice/browser-call-profiles",
        observed: assertion.passedFrameworks.length,
        remediation:
          "Run `bun run proof:profiles:browser-call` and fix any framework page that cannot open `/voice/realtime` or send microphone bytes.",
        sourceHref: "/api/voice/browser-call-profiles",
        threshold: 6,
        thresholdLabel: "Required passing framework browser-call profiles",
        unit: "count",
      },
      href: "/voice/browser-call-profiles",
      label: "Browser call profile evidence",
      proofSource: {
        detail:
          "Generated from real browser pages using fake microphone capture and `/voice/realtime` WebSocket byte evidence.",
        href: "/api/voice/browser-call-profiles",
        source: "browserCallProfiles",
        sourceLabel: "Browser call profile proof",
      },
      status: assertion.ok ? "pass" : "fail",
      value: `${assertion.passedFrameworks.length}/6 frameworks`,
    };
  };

const buildRealCallProfileReadinessCheck =
  async (): Promise<VoiceProductionReadinessCheck> =>
    buildVoiceRealCallProfileReadinessCheck(
      await readRealCallProfileDefaultsReport(),
      {
        browserProofHref:
          "/api/voice/real-call-profile-history/collect-browser-proof",
        href: "/voice/real-call-profile-history",
        minActionableProfiles: 2,
        minCycles: 10,
        minProfileCycles: 1,
        minProfileSessions: 1,
        operationsRecordsHref: "/voice-operations",
        phoneProofHref:
          "/api/voice/real-call-profile-history/collect-phone-proof",
        productionReadinessHref: "/production-readiness",
        requiredProfileIds: ["meeting-recorder", "support-agent"],
        requiredProfileSurfaces: {
          "meeting-recorder": ["browser", "live"],
          "support-agent": ["browser", "live"],
        },
        requiredProviderRoles: ["llm", "stt", "tts"],
        sourceHref: "/api/voice/real-call-profile-history",
      },
    );

const readLongProofWindowCalibrationSamples = async (): Promise<
  VoiceSloCalibrationSample[]
> => {
  const entries = await readdir(longProofWindowRoot, {
    withFileTypes: true,
  }).catch(() => []);
  const artifactPaths = [
    `${longProofWindowRoot}/latest.json`,
    ...entries
      .filter((entry) => entry.isDirectory())
      .map(
        (entry) =>
          `${longProofWindowRoot}/${entry.name}/long-proof-window.json`,
      ),
  ];
  const seen = new Set<string>();
  const samples: VoiceSloCalibrationSample[] = [];

  for (const path of artifactPaths) {
    const file = Bun.file(path);
    if (!(await file.exists())) {
      continue;
    }

    try {
      const parsed = (await file.json()) as {
        ok?: unknown;
        proofTrends?: {
          ok?: unknown;
          summary?: VoiceProofTrendSummary;
        };
        runId?: unknown;
        runtimeCalibration?: VoiceSloCalibrationSample;
      };
      const runId = typeof parsed.runId === "string" ? parsed.runId : path;
      if (seen.has(runId)) {
        continue;
      }
      seen.add(runId);

      samples.push({
        interruptionP95Ms: parsed.runtimeCalibration?.interruptionP95Ms,
        liveP95Ms: parsed.proofTrends?.summary?.maxLiveP95Ms,
        monitorRunP95Ms: parsed.runtimeCalibration?.monitorRunP95Ms,
        notifierDeliveryP95Ms: parsed.runtimeCalibration?.notifierDeliveryP95Ms,
        ok: parsed.ok === true && parsed.proofTrends?.ok === true,
        providerP95Ms: parsed.proofTrends?.summary?.maxProviderP95Ms,
        reconnectP95Ms: parsed.runtimeCalibration?.reconnectP95Ms,
        runId,
        source: path,
        turnP95Ms: parsed.proofTrends?.summary?.maxTurnP95Ms,
      });
    } catch {
      continue;
    }
  }

  if (samples.length > 0) {
    return samples;
  }

  const latestTrends = await readLatestProofTrends();

  return [
    {
      liveP95Ms: latestTrends.summary.maxLiveP95Ms,
      ok: latestTrends.ok,
      providerP95Ms: latestTrends.summary.maxProviderP95Ms,
      runId: latestTrends.runId,
      source: latestTrends.source,
      turnP95Ms: latestTrends.summary.maxTurnP95Ms,
    },
  ];
};

const demoSloThresholdProfileCacheMs = 60_000;

let demoSloThresholdProfileCache:
  | {
      expiresAt: number;
      promise: Promise<ReturnType<typeof createVoiceSloThresholdProfile>>;
    }
  | undefined;

const loadDemoSloThresholdProfile = () => {
  const now = Date.now();
  if (
    demoSloThresholdProfileCache &&
    demoSloThresholdProfileCache.expiresAt > now
  ) {
    return demoSloThresholdProfileCache.promise;
  }

  const promise = readLongProofWindowCalibrationSamples()
    .then((samples) =>
      createVoiceSloThresholdProfile(samples, {
        minPassingRuns: sloCalibrationMinRuns,
      }),
    )
    .catch((error) => {
      demoSloThresholdProfileCache = undefined;
      throw error;
    });
  demoSloThresholdProfileCache = {
    expiresAt: now + demoSloThresholdProfileCacheMs,
    promise,
  };

  return promise;
};

const loadProofPackSloThresholdProfile = (
  context?: ReturnType<typeof createVoiceProofPackBuildContext>,
) =>
  context
    ? context.cache("sloThresholdProfile", () =>
        context.time("sloThresholdProfile", loadDemoSloThresholdProfile),
      )
    : loadDemoSloThresholdProfile();

const formatTrendMs = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}ms`
    : "n/a";

const renderProofTrendsHTML = async () => {
  const report = await readLatestProofTrends();
  const cycles = report.cycles ?? [];
  const rows = cycles.length
    ? cycles
        .map(
          (cycle) => `<tr>
            <td>${escapeHtml(String(cycle.cycle ?? ""))}</td>
            <td>${escapeHtml(cycle.ok ? "pass" : "fail")}</td>
            <td>${escapeHtml(cycle.productionReadiness?.status ?? "n/a")}</td>
            <td>${escapeHtml(cycle.providerSlo?.status ?? "n/a")}</td>
            <td>${escapeHtml(formatTrendMs(cycle.turnLatency?.p95Ms))}</td>
            <td>${escapeHtml(formatTrendMs(cycle.liveLatency?.p95Ms))}</td>
            <td>${escapeHtml(String(cycle.providerSlo?.eventsWithLatency ?? 0))}</td>
            <td>${escapeHtml(String(cycle.opsRecovery?.issues ?? 0))}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="8">No sustained trend artifact found. Run <code>bun run proof:trends</code>.</td></tr>`;
  const status = report.status === "pass" ? "pass" : "warn";

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>AbsoluteJS Voice Sustained Proof Trends</title>
      <style>
        body{background:#0d1118;color:#f8f3e7;font-family:ui-sans-serif,system-ui,sans-serif;margin:0}
        main{max-width:1120px;margin:auto;padding:32px}
        a{color:#93c5fd}
        .hero,.card{background:#151b24;border:1px solid #263241;border-radius:24px;margin-bottom:16px;padding:22px}
        .hero{background:linear-gradient(135deg,rgba(59,130,246,.18),rgba(20,184,166,.14))}
        .eyebrow{color:#5eead4;font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        h1{font-size:clamp(2.4rem,6vw,5rem);line-height:.9;margin:.2rem 0 1rem}
        .muted{color:#a8b3bd;line-height:1.55}
        .status{border:1px solid ${status === "pass" ? "rgba(34,197,94,.6)" : "rgba(245,158,11,.7)"};border-radius:999px;display:inline-flex;font-weight:900;padding:8px 12px}
        .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-top:18px}
        .metric{background:#0f1620;border:1px solid #263241;border-radius:18px;padding:16px}
        .metric span{color:#a8b3bd;display:block;font-size:.8rem;text-transform:uppercase}
        .metric strong{display:block;font-size:2rem;margin-top:5px}
        table{border-collapse:collapse;width:100%}
        th,td{border-bottom:1px solid #263241;padding:10px;text-align:left}
        th{color:#a8b3bd;font-size:.78rem;text-transform:uppercase}
        code{background:#0b1117;border:1px solid #263241;border-radius:8px;padding:2px 6px}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/demo-checklist">Demo Checklist</a> · <a href="/production-readiness">Production Readiness</a> · <a href="/voice/provider-slos">Provider SLOs</a> · <a href="/api/voice/proof-trends">JSON</a> · <a href="/voice/proof-trends.md">Markdown</a></p>
        <section class="hero">
          <p class="eyebrow">Sustained proof</p>
          <h1>Longer-running latency, provider, recovery, and readiness trends</h1>
          <p class="muted">This page reads <code>${escapeHtml(latestProofTrendsJsonPath)}</code>. It proves the current defaults over repeated cycles instead of relying only on a one-shot proof pack.</p>
          <p class="status">Overall: ${escapeHtml(report.status.toUpperCase())}</p>
          <div class="grid">
            <div class="metric"><span>Cycles</span><strong>${escapeHtml(String(report.summary.cycles ?? cycles.length ?? 0))}</strong></div>
            <div class="metric"><span>Max provider p95</span><strong>${escapeHtml(formatTrendMs(report.summary.maxProviderP95Ms))}</strong></div>
            <div class="metric"><span>Max turn p95</span><strong>${escapeHtml(formatTrendMs(report.summary.maxTurnP95Ms))}</strong></div>
            <div class="metric"><span>Max live p95</span><strong>${escapeHtml(formatTrendMs(report.summary.maxLiveP95Ms))}</strong></div>
            <div class="metric"><span>Artifact age</span><strong>${escapeHtml(formatVoiceProofTrendAge(report.ageMs))}</strong></div>
            <div class="metric"><span>Fresh until</span><strong>${escapeHtml(report.freshUntil ?? "n/a")}</strong></div>
          </div>
        </section>
        <section class="card">
          <p class="muted">Generated ${escapeHtml(report.generatedAt ?? "not yet")} · stale after ${escapeHtml(formatVoiceProofTrendAge(report.maxAgeMs))} ${report.outputDir ? `· <code>${escapeHtml(report.outputDir)}</code>` : ""}</p>
          <table>
            <thead><tr><th>Cycle</th><th>Status</th><th>Readiness</th><th>Provider SLO</th><th>Turn p95</th><th>Live p95</th><th>Provider samples</th><th>Ops issues</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
      </main>
    </body>
  </html>`;
};

const readLatestVapiCoverageSummary =
  async (): Promise<VapiCoverageSummary> => {
    const file = Bun.file(latestProofPackJsonPath);

    if (!(await file.exists())) {
      const summary = buildVoicePlatformCoverageSummary({
        coverage: [],
        source: latestProofPackJsonPath,
      });

      return { ...summary, vapiCoverage: summary.coverage };
    }

    try {
      const parsed = (await file.json()) as {
        generatedAt?: unknown;
        ok?: unknown;
        outputDir?: unknown;
        runId?: unknown;
        vapiCoverage?: unknown;
      };
      const vapiCoverage = Array.isArray(parsed.vapiCoverage)
        ? (parsed.vapiCoverage as VoicePlatformCoverageSurface[])
        : [];
      const summary = buildVoicePlatformCoverageSummary({
        coverage: vapiCoverage,
        generatedAt:
          typeof parsed.generatedAt === "string"
            ? parsed.generatedAt
            : undefined,
        ok: parsed.ok === true,
        outputDir:
          typeof parsed.outputDir === "string" ? parsed.outputDir : undefined,
        runId: typeof parsed.runId === "string" ? parsed.runId : undefined,
        source: latestProofPackJsonPath,
      });

      return { ...summary, vapiCoverage: summary.coverage };
    } catch {
      const summary = buildVoicePlatformCoverageSummary({
        coverage: [],
        ok: false,
        source: latestProofPackJsonPath,
      });

      return {
        ...summary,
        status: "stale",
        vapiCoverage: summary.coverage,
      };
    }
  };

const readLatestVapiCoverage = async () => (await readLatestVapiCoverageSummary()).coverage;

const renderCoverageStatus = (coverage: VapiCoverageResult | undefined) => {
  if (!coverage) {
    return `<div class="coverage coverage-missing">
      <strong>No latest proof</strong>
      <span>Run <code>bun run proof:screenshots</code> to attach live evidence.</span>
    </div>`;
  }

  const status = coverage.status === "pass" ? "pass" : "fail";
  const evidence = (coverage.evidence ?? [])
    .map(
      (item) =>
        `<li>${escapeHtml(String(item.name ?? "proof"))} <span>${escapeHtml(String(item.method ?? "GET"))} ${escapeHtml(String(item.path ?? ""))} · ${escapeHtml(String(item.status ?? "n/a"))}</span></li>`,
    )
    .join("");
  const gap = coverage.gap
    ? `<p class="gap">${escapeHtml(coverage.gap)}</p>`
    : "";

  return `<div class="coverage coverage-${status}">
    <strong>${status.toUpperCase()}</strong>
    ${gap}
    <ul>${evidence}</ul>
  </div>`;
};

const renderSustainedProofStatus = (report: VoiceProofTrendReport) => {
  const cycles = report.cycles ?? [];
  const status = report.status === "pass" ? "pass" : "fail";
  const latestCycle = cycles.at(-1);
  const latestStatus = latestCycle
    ? latestCycle.ok
      ? "latest cycle passed"
      : "latest cycle failed"
    : "no cycles recorded";

  return `<section class="trend trend-${status}">
    <div>
      <p class="eyebrow">Sustained proof trends</p>
      <h2>Repeated-cycle evidence for the Vapi replacement claim</h2>
      <p class="muted">Read from <code>${escapeHtml(latestProofTrendsJsonPath)}</code>. This keeps the migration page honest by showing whether repeated provider, latency, recovery, and readiness checks are passing and fresh.</p>
      <p><a href="/voice/proof-trends">Open sustained trends</a> · <a href="/api/voice/proof-trends">Status JSON</a> · <a href="/voice/proof-trends.md">Markdown</a></p>
    </div>
    <div class="trend-metrics">
      <div><span>Status</span><strong>${escapeHtml(report.status.toUpperCase())}</strong></div>
      <div><span>Cycles</span><strong>${escapeHtml(String(report.summary.cycles ?? cycles.length ?? 0))}</strong></div>
      <div><span>Provider p95</span><strong>${escapeHtml(formatTrendMs(report.summary.maxProviderP95Ms))}</strong></div>
      <div><span>Turn p95</span><strong>${escapeHtml(formatTrendMs(report.summary.maxTurnP95Ms))}</strong></div>
      <div><span>Live p95</span><strong>${escapeHtml(formatTrendMs(report.summary.maxLiveP95Ms))}</strong></div>
      <div><span>Artifact age</span><strong>${escapeHtml(formatVoiceProofTrendAge(report.ageMs))}</strong></div>
      <div><span>Stale after</span><strong>${escapeHtml(formatVoiceProofTrendAge(report.maxAgeMs))}</strong></div>
      <div><span>Latest cycle</span><strong>${escapeHtml(latestStatus)}</strong></div>
    </div>
  </section>`;
};

const readLatestLiveGuardrailRuntimeProof = async (): Promise<{
  command: string;
  elapsedMs?: number;
  error?: string;
  ok: boolean;
  outputDir?: string;
  status?: number;
}> => {
  const file = Bun.file(latestProofPackJsonPath);

  if (!(await file.exists())) {
    return {
      command: "bun run smoke:live-guardrails",
      error: `Missing ${latestProofPackJsonPath}`,
      ok: false,
    };
  }

  try {
    const parsed = (await file.json()) as {
      commandResults?: unknown;
      outputDir?: unknown;
    };
    const commandResults = Array.isArray(parsed.commandResults)
      ? (parsed.commandResults as Array<Record<string, unknown>>)
      : [];
    const result = commandResults.find(
      (item) => item.name === "liveGuardrailsRuntime",
    );

    if (!result) {
      return {
        command: "bun run smoke:live-guardrails",
        error: "Latest proof pack does not include liveGuardrailsRuntime.",
        ok: false,
        outputDir:
          typeof parsed.outputDir === "string" ? parsed.outputDir : undefined,
      };
    }

    const command = Array.isArray(result.command)
      ? result.command.map(String).join(" ")
      : "bun run smoke:live-guardrails";

    return {
      command,
      elapsedMs:
        typeof result.elapsedMs === "number" ? result.elapsedMs : undefined,
      error: typeof result.error === "string" ? result.error : undefined,
      ok: result.ok === true,
      outputDir:
        typeof parsed.outputDir === "string" ? parsed.outputDir : undefined,
      status: typeof result.status === "number" ? result.status : undefined,
    };
  } catch (error) {
    return {
      command: "bun run smoke:live-guardrails",
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    };
  }
};

const postCallAnalysisOptions = (
  input: {
    reviewId?: string;
    sessionId?: string;
  } = {},
): VoicePostCallAnalysisOptions => {
  const sessionId = input.sessionId ?? demoIncidentSessionId;
  const reviewId = input.reviewId ?? `${sessionId}:review`;

  return {
    extractedFields: {
      category: "billing",
      customerId: "customer-1",
      followUpRequired: true,
    },
    fields: [
      { label: "Customer id", path: "customerId" },
      { label: "Call category", path: "category" },
      { label: "Follow-up flag", path: "followUpRequired" },
      { label: "Review target", path: "review.postCall.target" },
    ],
    integrationEvents: runtimeStorage.events,
    operationRecordBasePath: "/voice-operations/:sessionId",
    requireDeliveredIntegrationEvent: true,
    requiredTaskKinds: ["support-triage" as const],
    reviewId,
    reviews:
      runtimeStorage.reviews as unknown as VoicePostCallAnalysisOptions["reviews"],
    sessionId,
    tasks:
      runtimeStorage.tasks as unknown as VoicePostCallAnalysisOptions["tasks"],
  };
};

const renderPostCallAnalysisHTML = async () => {
  const report = await buildVoicePostCallAnalysisReport(
    postCallAnalysisOptions(),
  );
  const fields = report.fields
    .map(
      (field) =>
        `<tr><td>${escapeHtml(field.label)}</td><td>${escapeHtml(field.ok ? "pass" : "fail")}</td><td><code>${escapeHtml(field.path)}</code></td><td>${escapeHtml(String(field.value ?? ""))}</td></tr>`,
    )
    .join("");
  const issues =
    report.issues.length > 0
      ? report.issues
          .map(
            (issue) =>
              `<li>${escapeHtml(issue.severity)} · ${escapeHtml(issue.code)} · ${escapeHtml(issue.label)}</li>`,
          )
          .join("")
      : "<li>No post-call analysis issues.</li>";

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Voice Post-Call Analysis Proof</title>
      <style>
        body{background:#0c1118;color:#f8fafc;font-family:ui-sans-serif,system-ui,sans-serif;margin:0}
        main{max-width:1040px;margin:auto;padding:32px}
        a{color:#93c5fd}
        .hero{background:linear-gradient(135deg,rgba(251,191,36,.16),rgba(20,184,166,.13));border:1px solid #263241;border-radius:28px;margin-bottom:18px;padding:28px}
        .eyebrow{color:#facc15;font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        h1{font-size:clamp(2.2rem,5vw,4.5rem);line-height:.92;margin:.2rem 0 1rem}
        .muted{color:#a8b3bd}
        .metrics{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin:18px 0}
        .metrics div,section,table{background:#151b23;border:1px solid #263241;border-radius:18px}
        .metrics div,section{padding:16px}
        .metrics span{color:#a8b3bd;display:block;font-size:.72rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
        .metrics strong{display:block;font-size:1.7rem;margin-top:6px}
        table{border-collapse:collapse;overflow:hidden;width:100%}
        td,th{border-bottom:1px solid #263241;padding:12px;text-align:left}
        code{background:#0b1117;border:1px solid #263241;border-radius:8px;padding:2px 6px}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/switching-from-vapi">Switching from Vapi</a> · <a href="/voice-operations/${encodeURIComponent(report.sessionId ?? demoIncidentSessionId)}">Operations record</a> · <a href="/api/voice/post-call-analysis">JSON</a> · <a href="/api/voice/post-call-analysis.md">Markdown</a></p>
        <section class="hero">
          <p class="eyebrow">Post-call analysis proof</p>
          <h1>Extracted fields, follow-up tasks, and delivery evidence</h1>
          <p class="muted">This proves the Retell/Bland/Vapi-style post-call workflow without a hosted dashboard: the app owns the review, extracted fields, task, delivery event, and operation record link.</p>
        </section>
        <div class="metrics">
          <div><span>Status</span><strong>${escapeHtml(report.status.toUpperCase())}</strong></div>
          <div><span>Fields</span><strong>${report.summary.fields}</strong></div>
          <div><span>Tasks</span><strong>${report.summary.tasks}</strong></div>
          <div><span>Delivered events</span><strong>${report.summary.deliveredIntegrationEvents}</strong></div>
          <div><span>Missing fields</span><strong>${report.summary.missingRequiredFields}</strong></div>
          <div><span>Missing tasks</span><strong>${report.summary.missingRequiredTasks}</strong></div>
        </div>
        <section>
          <p><strong>Operations record:</strong> <a href="${escapeHtml(report.operationRecordHref ?? "/voice-operations/demo-incident-bundle")}">${escapeHtml(report.operationRecordHref ?? "/voice-operations/demo-incident-bundle")}</a></p>
          <p><strong>Review:</strong> <code>${escapeHtml(report.reviewId ?? "")}</code></p>
        </section>
        <h2>Extracted Fields</h2>
        <table><thead><tr><th>Field</th><th>Status</th><th>Path</th><th>Value</th></tr></thead><tbody>${fields}</tbody></table>
        <h2>Issues</h2>
        <section><ul>${issues}</ul></section>
      </main>
    </body>
  </html>`;
};

const renderProviderRecoveryHTML = async () => {
  const summary = summarizeVoiceProviderFallbackRecovery(
    await runtimeStorage.traces.list(),
  );
  const status = summary.status.toUpperCase();
  const detail =
    summary.unresolvedErrors > 0
      ? `${summary.unresolvedErrors} provider error(s) have no recovered fallback evidence.`
      : summary.recovered > 0
        ? `${summary.recovered} provider fallback recovery event(s) kept sessions healthy.`
        : "No provider fallback recovery was needed in the current trace window.";

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>AbsoluteJS Voice Provider Recovery</title>
      <style>
        body{background:#0d141b;color:#f8f3e7;font-family:ui-sans-serif,system-ui,sans-serif;margin:0}
        main{max-width:1080px;margin:auto;padding:32px}
        a{color:#67e8f9}
        .hero{background:linear-gradient(135deg,rgba(103,232,249,.18),rgba(251,191,36,.14));border:1px solid #294150;border-radius:30px;margin-bottom:18px;padding:28px}
        .eyebrow{color:#67e8f9;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        h1{font-size:clamp(2.4rem,6vw,4.8rem);line-height:.9;margin:.2rem 0 1rem}
        .status{border:1px solid ${summary.status === "pass" ? "rgba(34,197,94,.65)" : "rgba(239,68,68,.75)"};border-radius:999px;display:inline-flex;font-weight:900;padding:8px 12px}
        .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin:20px 0}
        article{background:#151d26;border:1px solid #283544;border-radius:20px;padding:18px}
        article span,.muted{color:#a8b3bd}
        article strong{display:block;font-size:2.1rem;margin-top:6px}
        .proof{background:#101820;border:1px solid #283544;border-radius:22px;padding:18px}
        code{background:#0b1117;border:1px solid #263241;border-radius:8px;padding:2px 6px}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/ops-console">Back to Ops Console</a> · <a href="/resilience">Resilience</a> · <a href="/production-readiness">Production readiness</a> · <a href="/api/production-readiness">Readiness JSON</a></p>
        <section class="hero">
          <p class="eyebrow">Resilience proof</p>
          <h1>Recovered provider fallback is not a failed session</h1>
          <p class="muted">AbsoluteJS keeps raw provider failures in replay, proves fallback recovery, and only fails readiness when recovery is unresolved.</p>
          <p class="status">Overall: ${escapeHtml(status)}</p>
        </section>
        <section class="grid">
          <article><span>Recovered events</span><strong>${summary.recovered}</strong></article>
          <article><span>Recovered sessions</span><strong>${summary.recoveredSessions}</strong></article>
          <article><span>Recovered turns</span><strong>${summary.recoveredTurns}</strong></article>
          <article><span>Unresolved errors</span><strong>${summary.unresolvedErrors}</strong></article>
        </section>
        <section class="proof">
          <h2>What this proves</h2>
          <p>${escapeHtml(detail)}</p>
          <p class="muted">Readiness value: <code>${escapeHtml(summary.total === 0 ? "0 events" : `${summary.recovered}/${summary.total}`)}</code>. Raw errors remain inspectable in <a href="/sessions">session replay</a> and <a href="/traces">trace timelines</a>.</p>
        </section>
      </main>
    </body>
  </html>`;
};

const readinessProfileCards = [
  {
    description:
      "For browser and meeting-recorder products: transcript capture, reconnects, barge-in, provider fallback, and live latency proof.",
    name: "meeting-recorder",
    surfaces: [
      { href: "/live-latency", label: "Live latency" },
      { href: "/sessions", label: "Sessions" },
      { href: "/resilience", label: "Provider fallback" },
      { href: "/voice/reconnect-contract", label: "Reconnect contract" },
      { href: "/barge-in", label: "Barge-in proof" },
      {
        href: "/api/provider-routing-contract",
        label: "Provider routing contract",
      },
    ],
  },
  {
    description:
      "For carrier-backed agents: setup parity, phone smoke proof, handoffs, routing contracts, and delivery queues.",
    name: "phone-agent",
    surfaces: [
      { href: "/phone-agent", label: "Phone agent setup" },
      { href: "/carriers", label: "Carrier matrix" },
      { href: "/handoffs", label: "Handoffs" },
      {
        href: "/api/provider-routing-contract",
        label: "Provider routing contract",
      },
      { href: "/delivery-runtime", label: "Delivery runtime" },
      { href: "/audit/deliveries", label: "Audit deliveries" },
      { href: "/traces/deliveries", label: "Trace deliveries" },
    ],
  },
  {
    description:
      "For operations-heavy deployments: audit evidence, operator action history, delivery health, runtime queues, and deploy gate status.",
    name: "ops-heavy",
    surfaces: [
      { href: "/production-readiness", label: "Production readiness" },
      { href: "/deploy-gate", label: "Deploy gate" },
      { href: "/voice/ops-actions", label: "Operator action history" },
      { href: "/delivery-runtime", label: "Delivery runtime" },
      { href: "/audit/deliveries", label: "Audit deliveries" },
      { href: "/traces/deliveries", label: "Trace deliveries" },
    ],
  },
] satisfies Array<{
  description: string;
  name: string;
  surfaces: Array<{ href: string; label: string }>;
}>;

export {
  buildBrowserCallProfileReadinessCheck,
  buildRealCallProfileReadinessCheck,
  loadDemoSloThresholdProfile,
  loadProofPackSloThresholdProfile,
  postCallAnalysisOptions,
  readLatestLiveGuardrailRuntimeProof,
  readLatestVapiCoverage,
  readLatestVapiCoverageSummary,
  readLongProofWindowCalibrationSamples,
  readReconnectProfileEvidenceSummary,
  readinessProfileCards,
  renderCoverageStatus,
  renderPostCallAnalysisHTML,
  renderProofTrendsHTML,
  renderProviderRecoveryHTML,
  renderReconnectProfileEvidenceCardHTML,
  renderSustainedProofStatus,
  seedDemoRealCallProfileHistory,
};
