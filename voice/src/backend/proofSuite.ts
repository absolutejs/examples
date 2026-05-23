import type { SavedIntake } from "../types/domain";
import {
  buildVoiceFailureReplay,
  buildVoiceProductionReadinessGate,
  buildVoiceProductionReadinessReport,
  createVoiceAgent,
  createVoiceAgentSquad,
  createVoiceProofPackStaleWhileRefreshSource,
  createVoiceWorkflowContractHandler,
  renderVoiceFailureReplayMarkdown,
  runVoiceCampaignDialerProof,
  summarizeVoiceLiveLatency,
  summarizeVoiceTurnLatency,
  type VoiceOnTurnObjectHandler,
  type VoiceSessionRecord,
  voice,
} from "@absolutejs/voice";
import { Elysia } from "elysia";
import { existsSync } from "node:fs";
import { resolveCarrierOrigin, seedTurnLatencyProof } from "./carrierHandoff";
import {
  campaignStore,
  generalWorkflowContract,
  guidedWorkflowContract,
  transferWorkflowContract,
} from "./contracts";
import { escapeHtml } from "./helpers";
import {
  cleanupDemoQualityNoise,
  getDemoProofStatus,
  listDemoProofTracesSafely,
  readLatestDemoVoiceProofPackFile,
} from "./observabilityExport";
import { assistant, ensureDemoIncidentBundleEvidence } from "./profileSwitch";
import {
  buildDemoBargeInReport,
  deliveryRuntimeControl,
  seedDemoBargeInProof,
  seedDemoDeliveryProof,
  storeLiveTurnLatencyTrace,
} from "./proofSeeds";
import {
  buildDemoProviderContractMatrix,
  deliveryTraceStore,
} from "./providers";
import { latestProofTrendsJsonPath } from "./realCallEvidence";
import {
  buildDemoOperationsRecord,
  productionReadinessOptions,
  refreshProductionReadinessProof,
} from "./sessionsProofPack";
import {
  demoIncidentSessionId,
  productionReadinessProofRuntime,
  runtimeStorage,
} from "./stores";
import type { DemoProofSurface } from "./observabilityExport";

const renderDeployGateHTML = async () => {
  const gate = await buildVoiceProductionReadinessGate(
    productionReadinessOptions(),
  );
  const issues = [...gate.failures, ...gate.warnings];
  const rows =
    issues.length > 0
      ? issues
          .map(
            (issue) => `<tr>
            <td><strong>${escapeHtml(issue.status.toUpperCase())}</strong></td>
            <td><code>${escapeHtml(issue.code)}</code></td>
            <td>${escapeHtml(issue.label)}${issue.detail ? `<br /><span>${escapeHtml(issue.detail)}</span>` : ""}</td>
            <td>${issue.href ? `<a href="${escapeHtml(issue.href)}">Open surface</a>` : ""}</td>
          </tr>`,
          )
          .join("")
      : `<tr><td colspan="4">No blocking failures or warnings.</td></tr>`;
  const profileRows = gate.profile
    ? gate.profile.surfaces
        .map((surface) => {
          const surfaceIssues =
            surface.issues.length > 0
              ? surface.issues
                  .map((issue) => `<code>${escapeHtml(issue.code)}</code>`)
                  .join("<br />")
              : "No blocking issues";

          return `<tr>
            <td><strong>${escapeHtml(surface.status.toUpperCase())}</strong></td>
            <td>${surface.href ? `<a href="${escapeHtml(surface.href)}">${escapeHtml(surface.label)}</a>` : escapeHtml(surface.label)}<br /><span>${surface.configured ? "configured" : "expected"}</span></td>
            <td>${surfaceIssues}</td>
          </tr>`;
        })
        .join("")
    : "";
  const statusText = gate.ok ? "OPEN" : "CLOSED";
  const strictText =
    "Set gate.failOnWarnings to true when you want warnings to close the gate.";
  const json = escapeHtml(JSON.stringify(gate, null, 2));
  const deployScript =
    escapeHtml(`const baseUrl = process.env.VOICE_BASE_URL ?? "http://localhost:3004";
const response = await fetch(new URL("/api/production-readiness/gate", baseUrl));
const gate = await response.json();

if (!response.ok || !gate.ok) {
  console.error("Voice deploy gate closed");
  for (const issue of [...gate.failures, ...gate.warnings]) {
    console.error(\`\${issue.code}: \${issue.detail ?? issue.label}\`);
  }
  process.exit(1);
}

console.log("Voice deploy gate open");`);

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>AbsoluteJS Voice Deploy Gate</title>
      <style>
        body{background:#0f1720;color:#f8f3e7;font-family:ui-sans-serif,system-ui,sans-serif;margin:0}
        main{max-width:1120px;margin:auto;padding:32px}
        a{color:#7dd3fc}
        .hero{background:linear-gradient(135deg,rgba(125,211,252,.18),rgba(245,158,11,.15));border:1px solid #304153;border-radius:30px;margin-bottom:18px;padding:28px}
        .eyebrow{color:#7dd3fc;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        h1{font-size:clamp(2.4rem,6vw,4.9rem);line-height:.9;margin:.2rem 0 1rem}
        .status{border:1px solid ${gate.ok ? "rgba(34,197,94,.65)" : "rgba(239,68,68,.75)"};border-radius:999px;display:inline-flex;font-weight:900;padding:8px 12px}
        .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:18px 0}
        article,pre,table{background:#151f2b;border:1px solid #2d3d4e;border-radius:20px}
        article{padding:18px}
        article span,.muted,td span{color:#a8b3bd}
        article strong{display:block;font-size:2.2rem;margin-top:6px}
        table{border-collapse:collapse;overflow:hidden;width:100%}
        th,td{border-bottom:1px solid #2d3d4e;padding:14px;text-align:left;vertical-align:top}
        code{color:#bae6fd}
        pre{overflow:auto;padding:18px}
        .script{position:relative}
        button{background:#7dd3fc;border:0;border-radius:999px;color:#082f49;cursor:pointer;font-weight:900;padding:10px 14px}
        button:disabled{cursor:wait;opacity:.7}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/ops-console">Back to Ops Console</a> · <a href="/production-readiness">Production readiness</a> · <a href="/api/production-readiness/gate">Gate JSON</a></p>
        <section class="hero">
          <p class="eyebrow">Deploy gate primitive</p>
          <h1>One HTTP check for self-hosted release confidence</h1>
          <p class="muted">This page is just a demo wrapper around <code>buildVoiceProductionReadinessGate</code>. AbsoluteJS ships the primitive and route; teams decide how their deploy process calls it.</p>
          <p class="status">Gate: ${escapeHtml(statusText)}</p>
        </section>
        <section class="grid">
          <article><span>HTTP status</span><strong>${gate.ok ? "200" : "503"}</strong></article>
          <article><span>Failures</span><strong>${gate.failures.length}</strong></article>
          <article><span>Warnings</span><strong>${gate.warnings.length}</strong></article>
          <article><span>Policy</span><strong>warn allowed</strong></article>
        </section>
        <h2>What a deploy script checks</h2>
        <p class="muted">Call <code>/api/production-readiness/gate</code>. A closed gate returns <code>503</code> and stable issue codes like <code>voice.readiness.operator_action_history</code>.</p>
        ${
          gate.profile
            ? `<h2>Profile surface blockers</h2>
        <p class="muted"><code>${escapeHtml(gate.profile.name)}</code> groups gate issues by the proof surface they block.</p>
        <table>
          <thead><tr><th>Status</th><th>Profile surface</th><th>Issues</th></tr></thead>
          <tbody>${profileRows}</tbody>
        </table>`
            : ""
        }
        <h2>Minimal consumer script</h2>
        <p class="muted">This is intentionally small: point it at your running AbsoluteJS server and let HTTP status plus <code>gate.ok</code> decide whether to continue.</p>
        <p><button type="button" data-copy-script>Copy script</button></p>
        <pre class="script" id="deploy-gate-script">${deployScript}</pre>
        <table>
          <thead><tr><th>Status</th><th>Code</th><th>Check</th><th>Surface</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <h2>Raw gate JSON</h2>
        <pre>${json}</pre>
        <p class="muted">${escapeHtml(strictText)}</p>
      </main>
      <script>
        const button = document.querySelector("[data-copy-script]");
        button?.addEventListener("click", async () => {
          const script = document.getElementById("deploy-gate-script")?.textContent ?? "";
          await navigator.clipboard.writeText(script);
          const original = button.textContent;
          button.textContent = "Copied";
          button.disabled = true;
          setTimeout(() => {
            button.textContent = original;
            button.disabled = false;
          }, 1200);
        });
      </script>
    </body>
  </html>`;
};

const readLatestDemoVoiceProofPack =
  createVoiceProofPackStaleWhileRefreshSource({
    maxAgeMs: 5 * 60_000,
    read: readLatestDemoVoiceProofPackFile,
    onRefreshError: (error) => {
      console.warn("Failed to refresh demo voice proof pack", error);
    },
    refresh: async () => {
      await refreshProductionReadinessProof();

      return readLatestDemoVoiceProofPackFile();
    },
  });

const runDemoProofSuite = async (request: Request) => {
  await ensureDemoIncidentBundleEvidence();

  const liveLatencyStartedAt = Date.now() - 560;
  const [turnLatencyProof, campaignDialerProof] = await Promise.all([
    seedTurnLatencyProof(),
    runVoiceCampaignDialerProof({
      baseUrl: resolveCarrierOrigin(request),
      store: campaignStore,
    }),
    seedDemoBargeInProof(),
    seedDemoDeliveryProof(),
    cleanupDemoQualityNoise(),
    storeLiveTurnLatencyTrace({
      completedAt: liveLatencyStartedAt + 420,
      id: `demo-proof-live-latency-${crypto.randomUUID()}`,
      latencyMs: 420,
      sessionId: `demo-proof-live-latency-${crypto.randomUUID()}`,
      startedAt: liveLatencyStartedAt,
      status: "assistant_audio_started",
      thresholdMs: 1_800,
    }),
    deliveryRuntimeControl.tick(),
  ]);

  const [
    bargeIn,
    liveLatency,
    turnLatency,
    readiness,
    providerContracts,
    deliverySummary,
    traces,
  ] = await Promise.all([
    buildDemoBargeInReport(),
    summarizeVoiceLiveLatency({ store: deliveryTraceStore }),
    summarizeVoiceTurnLatency({
      store: runtimeStorage.session,
      traceStore: runtimeStorage.traces,
    }),
    buildVoiceProductionReadinessReport(
      productionReadinessOptions({
        fast: true,
        includeObservabilityExport: false,
        refresh: false,
      }),
    ),
    buildDemoProviderContractMatrix(),
    deliveryRuntimeControl.summarize(),
    listDemoProofTracesSafely(),
  ]);
  const readinessPassed = readiness.checks.filter(
    (check) => check.status === "pass",
  ).length;
  const auditDelivery = deliverySummary.audit ?? {
    deadLettered: 0,
    failed: 0,
    pending: 0,
  };
  const traceDelivery = deliverySummary.trace ?? {
    deadLettered: 0,
    failed: 0,
    pending: 0,
  };
  const surfaces: DemoProofSurface[] = [
    {
      detail: `${bargeIn.total} interruption(s), ${bargeIn.averageLatencyMs ?? 0}ms average. Source: ${bargeIn.sourceLabel}.`,
      href: "/barge-in",
      label: "Barge-in",
      status: bargeIn.status,
    },
    {
      detail: `${liveLatency.total} sample(s), p95 ${liveLatency.p95LatencyMs ?? 0}ms.`,
      href: "/live-latency",
      label: "Live latency",
      status: liveLatency.status,
    },
    {
      detail: `${turnLatency.total} turn(s), average ${turnLatency.averageTotalMs ?? 0}ms. Seed: ${turnLatencyProof.sessionId}.`,
      href: "/turn-latency",
      label: "Turn waterfall",
      status: turnLatency.status,
    },
    {
      detail: existsSync(latestProofTrendsJsonPath)
        ? "Latest sustained trend artifact is available for repeated provider, latency, recovery, and readiness proof."
        : "Run bun run proof:trends to create repeated-cycle trend proof.",
      href: "/voice/proof-trends",
      label: "Sustained trends",
      status: existsSync(latestProofTrendsJsonPath) ? "pass" : "empty",
    },
    {
      detail: `${providerContracts.passed}/${providerContracts.total} provider contract rows passing.`,
      href: "/provider-contracts",
      label: "Provider contracts",
      status: providerContracts.status,
    },
    {
      detail: `${readinessPassed}/${readiness.checks.length} readiness checks passing.`,
      href: "/production-readiness",
      label: "Production readiness",
      status: readiness.status,
    },
    {
      detail: `${auditDelivery.pending + traceDelivery.pending} pending delivery item(s), ${auditDelivery.deadLettered + traceDelivery.deadLettered} dead-lettered.`,
      href: "/delivery-runtime",
      label: "Delivery runtime",
      status:
        auditDelivery.deadLettered > 0 || traceDelivery.deadLettered > 0
          ? "fail"
          : auditDelivery.pending > 0 || traceDelivery.pending > 0
            ? "warn"
            : "pass",
    },
    {
      detail: `${campaignDialerProof.providers.length} carrier provider proof report(s).`,
      href: "/voice/campaigns/dialer-proof",
      label: "Campaign dialer",
      status: campaignDialerProof.providers.every((provider) =>
        provider.outcomes.every((outcome) => outcome.applied),
      )
        ? "pass"
        : "fail",
    },
    {
      detail: `${traces.length} recent trace event(s) available for drill-down.`,
      href: "/traces",
      label: "Trace timelines",
      status: traces.length > 0 ? "pass" : "empty",
    },
    {
      detail:
        "Redacted trace, audit, handoff, and tool evidence exported from a single support session.",
      href: `/voice-incidents/${demoIncidentSessionId}/markdown`,
      label: "Incident bundle",
      status: "pass",
    },
  ];

  return {
    checkedAt: Date.now(),
    status: getDemoProofStatus(surfaces),
    surfaces,
  };
};

const renderFailureReplayHTML = (
  report: ReturnType<typeof buildVoiceFailureReplay>,
) => {
  const providerRows =
    report.providers.steps
      .map(
        (step) => `<li>
          <strong>${escapeHtml(step.provider ?? step.selectedProvider ?? "provider")}</strong>
          <span>${escapeHtml(step.status ?? "unknown")} ${step.fallbackProvider ? `via ${escapeHtml(step.fallbackProvider)}` : ""}</span>
          <small>${escapeHtml(step.reason ?? "No reason recorded.")}</small>
        </li>`,
      )
      .join("") || "<li>No provider recovery steps recorded.</li>";
  const mediaRows =
    report.media.steps
      .map(
        (step) => `<li>
          <strong>${escapeHtml(step.carrier ?? "carrier")} ${escapeHtml(step.event)}</strong>
          <span>${escapeHtml(step.direction ?? "lifecycle")} · ${String(step.audioBytes)} bytes</span>
          ${step.issue ? `<small>${escapeHtml(step.issue)}</small>` : ""}
        </li>`,
      )
      .join("") || "<li>No carrier media steps recorded.</li>";
  const heardRows =
    report.summary.userHeard
      .map((text) => `<li>${escapeHtml(text)}</li>`)
      .join("") || "<li>No assistant output recorded.</li>";
  const issueRows =
    report.summary.issues
      .map((issue) => `<li>${escapeHtml(issue)}</li>`)
      .join("") || "<li>No failure or recovery issues recorded.</li>";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Voice Failure Replay</title><style>body{background:#0f1417;color:#f8f4e8;font-family:ui-sans-serif,system-ui,sans-serif;margin:0}main{margin:auto;max-width:1080px;padding:32px}.eyebrow{color:#fbbf24;font-size:.78rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}h1{font-size:clamp(2.2rem,6vw,4.4rem);letter-spacing:-.06em;line-height:.9;margin:.2rem 0 1rem}.status{border:1px solid #475569;border-radius:999px;display:inline-flex;padding:8px 12px}.healthy,.recovered{color:#86efac}.degraded{color:#fbbf24}.failed{color:#fca5a5}.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:20px 0}section,.card{background:#182025;border:1px solid #2d3a43;border-radius:20px;padding:16px}.card span,small{color:#a9b4bd}.card strong{display:block;font-size:2rem}ul{display:grid;gap:10px;list-style:none;padding:0}li{background:#10171b;border:1px solid #2d3a43;border-radius:14px;padding:12px}li span,li small{display:block;margin-top:4px}.actions{display:flex;flex-wrap:wrap;gap:10px}.actions a{background:#fbbf24;border-radius:999px;color:#111827;font-weight:900;padding:10px 14px;text-decoration:none}</style></head><body><main><p class="eyebrow">Failure replay</p><h1>What failed, recovered, and reached the user</h1><p class="status ${escapeHtml(report.status)}">${escapeHtml(report.status)}</p><p>Session <code>${escapeHtml(report.sessionId)}</code></p><div class="actions"><a href="${escapeHtml(report.operationsRecordHref ?? `/voice-operations/${encodeURIComponent(report.sessionId)}`)}">Open operations record</a><a href="/voice-operations/${encodeURIComponent(report.sessionId)}/failure-replay.md">Markdown replay</a></div><div class="grid"><div class="card"><span>Provider fallbacks</span><strong>${String(report.providers.fallbacks)}</strong></div><div class="card"><span>Provider degraded</span><strong>${String(report.providers.degraded)}</strong></div><div class="card"><span>Media steps</span><strong>${String(report.media.total)}</strong></div><div class="card"><span>User heard</span><strong>${String(report.summary.userHeard.length)}</strong></div></div><section><h2>What Failed Or Recovered</h2><ul>${issueRows}</ul></section><section><h2>Provider Path</h2><ul>${providerRows}</ul></section><section><h2>Media Path</h2><ul>${mediaRows}</ul></section><section><h2>What The User Heard</h2><ul>${heardRows}</ul></section></main></body></html>`;
};

const failureReplayRoutes = new Elysia()
  .get(
    "/api/voice-operations/:sessionId/failure-replay",
    async ({ params }) => {
      const sessionId = params.sessionId ?? demoIncidentSessionId;
      const record = await buildDemoOperationsRecord(sessionId);

      return buildVoiceFailureReplay(record, {
        operationsRecordHref: `/voice-operations/${encodeURIComponent(sessionId)}`,
      });
    },
  )
  .get("/voice-operations/:sessionId/failure-replay.md", async ({ params }) => {
    const sessionId = params.sessionId ?? demoIncidentSessionId;
    const record = await buildDemoOperationsRecord(sessionId);
    const replay = buildVoiceFailureReplay(record, {
      operationsRecordHref: `/voice-operations/${encodeURIComponent(sessionId)}`,
    });

    return new Response(renderVoiceFailureReplayMarkdown(replay), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
      },
    });
  })
  .get("/voice-operations/:sessionId/failure-replay", async ({ params }) => {
    const sessionId = params.sessionId ?? demoIncidentSessionId;
    const record = await buildDemoOperationsRecord(sessionId);
    const replay = buildVoiceFailureReplay(record, {
      operationsRecordHref: `/voice-operations/${encodeURIComponent(sessionId)}`,
    });

    return new Response(renderFailureReplayHTML(replay), {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }) as unknown as Elysia;

const isSpecialistBillingTurn = (text: string) =>
  /\b(billing|invoice|refund|payment|subscription|charge|receipt)\b/i.test(
    text,
  );

const createDemoLiveAgentSquad = () => {
  const supportAgent = createVoiceAgent<
    unknown,
    VoiceSessionRecord,
    SavedIntake
  >({
    id: "front-desk",
    model: {
      generate: ({ turn }) => ({
        handoff: {
          metadata: {
            demoSurface: "agent-squad",
            detectedIntent: "billing",
          },
          reason: `Billing specialist requested for: ${turn.text}`,
          targetAgentId: "billing",
        },
      }),
    },
    system:
      "You are the demo front desk. Route billing, invoice, refund, payment, subscription, charge, and receipt requests to billing.",
    trace: deliveryTraceStore,
  });
  const billingAgent = createVoiceAgent<
    unknown,
    VoiceSessionRecord,
    SavedIntake
  >({
    id: "billing",
    model: {
      generate: ({ turn }) => ({
        assistantText: `Billing specialist here. I can help with that account question: ${turn.text}`,
      }),
    },
    system:
      "You are the billing specialist. Answer only from the handoff summary and current caller turn.",
    trace: deliveryTraceStore,
  });

  return createVoiceAgentSquad<unknown, VoiceSessionRecord, SavedIntake>({
    agents: [supportAgent, billingAgent],
    defaultAgentId: "front-desk",
    id: "demo-agent-squad",
    trace: deliveryTraceStore,
    contextPolicy: ({ summaryMessage, turn }) => ({
      messages: [
        summaryMessage,
        {
          content: turn.text,
          role: "user",
        },
      ],
      metadata: {
        contextPolicy: "handoff-summary-current-turn",
        demoSurface: "agent-squad",
      },
      system:
        "Use only the handoff summary and current caller turn. Do not inspect unrelated prior turns.",
    }),
    handoffPolicy: ({ handoff }) => ({
      metadata: {
        certifiedRoute: "front-desk-to-billing",
        ...handoff.metadata,
      },
      summary:
        "The front desk detected a billing/account question and routed this caller to billing.",
    }),
  });
};

const demoLiveAgentSquad = createDemoLiveAgentSquad();

type DemoVoiceTurnInput = Parameters<
  VoiceOnTurnObjectHandler<unknown, VoiceSessionRecord, SavedIntake>
>[0];

const runDemoLiveAgentSquad = demoLiveAgentSquad.run as (
  input: DemoVoiceTurnInput,
) => Promise<{
  assistantText?: string;
  complete?: boolean;
  escalate?: { metadata?: Record<string, unknown>; reason: string };
  noAnswer?: { metadata?: Record<string, unknown> };
  result?: SavedIntake;
  transfer?: {
    metadata?: Record<string, unknown>;
    reason?: string;
    target: string;
  };
  voicemail?: { metadata?: Record<string, unknown> };
}>;

// One contract-aware turn handler: the billing-specialist branch lives inside
// the handler passed to createVoiceWorkflowContractHandler so the contract
// wrapper invokes it with the correct ({ session, turn, api, context }) shape.
// (Wrapping the contract handler in a second object-style handler silently
// dropped the turn — the wrapper returns a positional handler — and crashed
// every non-billing turn on `input.turn.id`.)
const contractAwareOnTurn = createVoiceWorkflowContractHandler<
  unknown,
  VoiceSessionRecord,
  SavedIntake
>({
  store: deliveryTraceStore,
  handler: async (input: DemoVoiceTurnInput) => {
    if (isSpecialistBillingTurn(input.turn.text)) {
      const result = await runDemoLiveAgentSquad(input);

      return {
        assistantText: result.assistantText,
        complete: result.complete,
        escalate: result.escalate,
        noAnswer: result.noAnswer,
        result: result.result,
        transfer: result.transfer,
        voicemail: result.voicemail,
      };
    }

    return assistant.onTurn(input);
  },
  resolveContract: ({ result, session }) => {
    if (result.transfer) {
      return transferWorkflowContract;
    }

    if (!result.complete) {
      return undefined;
    }

    return session.scenarioId === "general"
      ? generalWorkflowContract
      : guidedWorkflowContract;
  },
});

export {
  contractAwareOnTurn,
  failureReplayRoutes,
  readLatestDemoVoiceProofPack,
  renderDeployGateHTML,
  runDemoProofSuite,
};
