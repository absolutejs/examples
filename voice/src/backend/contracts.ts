import type { SavedIntake } from "../types/domain";
import {
  createVoiceCampaignTelephonyOutcomeRecorder,
  createVoiceTelephonyOutcomePolicy,
  createVoiceTelephonyWebhookRoutes,
  createVoiceWorkflowContractPreset,
  resolveVoiceTelephonyOutcome,
  type VoiceOutcomeContractDefinition,
  type VoiceTelephonyOutcomeProviderEvent,
  type VoiceTelephonyProvider,
  type VoiceTelephonyWebhookDecision,
  voice,
  voiceTelephonyOutcomeToRouteResult,
} from "@absolutejs/voice";
import {
  createVoiceDrizzleCampaignStore,
  createVoiceDrizzleTelephonyWebhookIdempotencyStore,
} from "@absolutejs/voice/drizzle";
import { db } from "../../db/client";
import { VOICE_INTAKES_TOPIC } from "../constants/sync";
import { escapeHtml, stringifyForHtml } from "./helpers";
import { reactiveHub } from "./sync";
import { savedIntakesStore } from "./stores";

const SAVED_INTAKE_LIMIT = 12;

const listIntakes = () => savedIntakesStore.list();

const persistIntake = async (intake: SavedIntake) => {
  await savedIntakesStore.set(intake.id, intake);

  const all = await savedIntakesStore.list();
  for (const stale of all.slice(SAVED_INTAKE_LIMIT)) {
    await savedIntakesStore.remove(stale.id);
  }

  // Notify subscribed "saved captures" widgets to refetch — no polling.
  reactiveHub.publish(VOICE_INTAKES_TOPIC);
};

const guidedWorkflowContract = createVoiceWorkflowContractPreset<SavedIntake>(
  "support-triage",
  {
    description:
      "The guided demo should collect the expected test answers and complete without provider errors.",
    fields: [
      { aliases: ["issue.summary"], path: "transcript" },
      { aliases: ["resolution.nextStep"], path: "assistantSummary" },
      { match: "non-empty", path: "promptAnswers" },
      { match: "number", path: "turnCount" },
    ],
    id: "guided-demo-completes",
    label: "Guided demo completes",
    maxProviderErrors: 0,
    minSessions: 1,
    minTurns: 3,
    outcome: "complete",
    requiredDisposition: "completed",
    requiredTranscriptIncludes: ["name", "integration", "follow up"],
    scenarioId: "guided",
  },
);

const generalWorkflowContract = createVoiceWorkflowContractPreset<SavedIntake>(
  "support-triage",
  {
    description:
      "General recording should save at least one freeform turn and end cleanly.",
    fields: [
      { aliases: ["issue.summary"], path: "transcript" },
      { aliases: ["resolution.nextStep"], path: "assistantSummary" },
      { match: "number", path: "turnCount" },
    ],
    id: "general-recording-completes",
    label: "General recording completes",
    maxProviderErrors: 0,
    minSessions: 1,
    minTurns: 1,
    outcome: "complete",
    requiredDisposition: "completed",
    scenarioId: "general",
  },
);

const transferWorkflowContract = createVoiceWorkflowContractPreset<SavedIntake>(
  "transfer-handoff",
  {
    description:
      "Any transfer outcome must create a handoff delivery path for downstream ops.",
    fields: [
      { aliases: ["transfer.summary"], path: "transcript" },
      { aliases: ["transfer.reason"], path: "assistantSummary" },
      { aliases: ["transfer.target"], path: "callTarget", required: false },
    ],
    id: "transfer-handoff-delivered",
    label: "Transfer handoff delivered",
    minSessions: 0,
    outcome: "transfer",
    requiredDisposition: "transferred",
    requiredHandoffActions: ["transfer"],
    scenarioId: "proof-transfer",
  },
);

const workflowScenarios = [
  guidedWorkflowContract.toScenarioEval({ scenarioId: "proof-guided" }),
  generalWorkflowContract.toScenarioEval({ scenarioId: "proof-general" }),
  transferWorkflowContract.toScenarioEval({ scenarioId: "proof-transfer" }),
];

const demoOutcomeContracts = [
  {
    description:
      "Completed calls must persist the session review and emit call/review integration events.",
    expectedDisposition: "completed",
    id: "completed-call-artifacts",
    label: "Completed call artifacts",
    requireIntegrationEvents: ["call.completed", "review.saved"],
    requireReview: true,
  },
  {
    description:
      "Transfers must leave review evidence, a follow-up task, a transfer handoff, and integration events.",
    expectedDisposition: "transferred",
    id: "transfer-call-artifacts",
    label: "Transfer call artifacts",
    requireHandoffActions: ["transfer"],
    requireIntegrationEvents: [
      "call.completed",
      "review.saved",
      "task.created",
    ],
    requireReview: true,
    requireTask: true,
  },
  {
    description:
      "Escalations must create a review, follow-up task, and task integration event.",
    expectedDisposition: "escalated",
    id: "escalation-call-artifacts",
    label: "Escalation call artifacts",
    requireIntegrationEvents: [
      "call.completed",
      "review.saved",
      "task.created",
    ],
    requireReview: true,
    requireTask: true,
  },
  {
    description:
      "Voicemail outcomes must create review evidence and callback work.",
    expectedDisposition: "voicemail",
    id: "voicemail-call-artifacts",
    label: "Voicemail call artifacts",
    requireIntegrationEvents: [
      "call.completed",
      "review.saved",
      "task.created",
    ],
    requireReview: true,
    requireTask: true,
  },
  {
    description:
      "No-answer outcomes must create review evidence and retry/callback work.",
    expectedDisposition: "no-answer",
    id: "no-answer-call-artifacts",
    label: "No-answer call artifacts",
    requireIntegrationEvents: [
      "call.completed",
      "review.saved",
      "task.created",
    ],
    requireReview: true,
    requireTask: true,
  },
] satisfies VoiceOutcomeContractDefinition[];

const telephonyOutcomePolicy = createVoiceTelephonyOutcomePolicy({
  metadata: {
    app: "absolutejs-voice-example",
  },
  minAnsweredDurationMs: 1_000,
  transferTarget: ({ metadata }) =>
    typeof metadata?.queue === "string" ? metadata.queue : undefined,
});

const telephonyWebhookIdempotencyStore =
  createVoiceDrizzleTelephonyWebhookIdempotencyStore<SavedIntake>({ db });

const campaignStore = createVoiceDrizzleCampaignStore({ db });

const telephonyOutcomeRecorder = createVoiceCampaignTelephonyOutcomeRecorder({
  maxSnapshots: 20,
  store: campaignStore,
});

const recordTelephonyWebhookDecision = async (
  provider: VoiceTelephonyProvider,
  input: VoiceTelephonyWebhookDecision,
) => {
  await telephonyOutcomeRecorder.record({
    ...input,
    provider,
  });
};

const renderCampaignDialerProofHTML = () => `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Campaign Dialer Proof</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;background:#0b1220;color:#f8fafc;margin:0}
        main{max-width:1080px;margin:auto;padding:32px}
        a{color:#5eead4}
        button{background:#5eead4;border:0;border-radius:999px;color:#042f2e;cursor:pointer;font-weight:900;padding:12px 18px}
        button:disabled{cursor:wait;opacity:.6}
        pre{background:#111c2f;border:1px solid #334155;border-radius:18px;overflow:auto;padding:18px}
        .hero{background:linear-gradient(135deg,rgba(20,184,166,.22),rgba(251,146,60,.16));border:1px solid #334155;border-radius:28px;padding:28px}
        .muted{color:#9fb0c5}
      </style>
      <script>
        async function runDialerProof(button) {
          button.disabled = true;
          const output = document.getElementById("campaign-dialer-proof-output");
          output.textContent = "Running Twilio, Telnyx, and Plivo dry-run campaign proofs...";
          try {
            const response = await fetch("/api/voice/campaigns/dialer-proof", { method: "POST" });
            const payload = await response.json();
            output.textContent = JSON.stringify(payload, null, 2);
          } catch (error) {
            output.textContent = error instanceof Error ? error.message : String(error);
          } finally {
            button.disabled = false;
          }
        }
      </script>
    </head>
    <body>
      <main>
        <p><a href="/ops-console">Back to Ops Console</a> · <a href="/voice/campaigns/observability">Campaign observability</a></p>
        <section class="hero">
          <p class="muted">Self-hosted campaign carrier proof</p>
          <h1>Queue to carrier dial to webhook outcome, without making a real call</h1>
          <p class="muted">This runs the same Twilio, Telnyx, and Plivo campaign dialer primitives with an intercepted fetch, proves campaign metadata is attached, and applies a synthetic completed webhook outcome back into the campaign store.</p>
          <button type="button" onclick="runDialerProof(this)">Run dry-run dialer proof</button>
        </section>
        <pre id="campaign-dialer-proof-output">No proof run yet.</pre>
      </main>
    </body>
  </html>`;

const telephonyOutcomeSamples = [
  {
    event: {
      provider: "twilio",
      sipCode: 486,
      status: "busy",
    },
    label: "Carrier no-answer",
  },
  {
    event: {
      answeredBy: "machine_start",
      provider: "twilio",
      status: "completed",
    },
    label: "Machine detection voicemail",
  },
  {
    event: {
      metadata: {
        queue: "billing",
      },
      provider: "twilio",
      reason: "warm-transfer",
      status: "bridged",
    },
    label: "Warm transfer bridge",
  },
] satisfies Array<{
  event: VoiceTelephonyOutcomeProviderEvent;
  label: string;
}>;

const listTelephonyOutcomePreviews = () =>
  telephonyOutcomeSamples.map((sample) => {
    const decision = resolveVoiceTelephonyOutcome(
      sample.event,
      telephonyOutcomePolicy,
    );

    return {
      decision,
      event: sample.event,
      label: sample.label,
      routeResult: voiceTelephonyOutcomeToRouteResult(decision),
    };
  });

const renderTelephonyOutcomePreviewHTML = () => {
  const rows = listTelephonyOutcomePreviews()
    .map(
      (preview) => `<tr>
        <td>${escapeHtml(preview.label)}</td>
        <td><code>${escapeHtml(JSON.stringify(preview.event))}</code></td>
        <td><strong>${escapeHtml(preview.decision.action)}</strong><br /><span class="muted">${escapeHtml(preview.decision.source)} / ${escapeHtml(preview.decision.confidence)}</span></td>
        <td><code>${escapeHtml(JSON.stringify(preview.routeResult))}</code></td>
      </tr>`,
    )
    .join("");

  const webhookExample = escapeHtml(
    "curl -X POST http://localhost:3000/api/telephony-webhook -H 'content-type: application/x-www-form-urlencoded' --data 'CallSid=demo-call&CallStatus=busy&SipResponseCode=486'",
  );

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Telephony Outcome Preview</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;background:#111827;color:#f8fafc;margin:0}
        main{max-width:1120px;margin:auto;padding:32px}
        a{color:#93c5fd}
        .muted{color:#9ca3af}
        table{width:100%;border-collapse:collapse;background:#1f2937;border-radius:18px;overflow:hidden}
        th,td{border-bottom:1px solid #374151;padding:14px;text-align:left;vertical-align:top}
        code{white-space:normal;word-break:break-word;color:#bfdbfe}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/ops-console">Back to Ops Console</a></p>
        <p class="muted">Telephony primitive preview</p>
        <h1>Carrier events become AbsoluteJS lifecycle outcomes</h1>
        <p class="muted">Use <code>resolveVoiceTelephonyOutcome</code>, <code>voiceTelephonyOutcomeToRouteResult</code>, or <code>applyVoiceTelephonyOutcome</code> in carrier webhooks to keep transfer, voicemail, and no-answer behavior deterministic.</p>
        <p class="muted">This demo also mounts <code>createVoiceTelephonyWebhookRoutes</code> at <code>/api/telephony-webhook</code>.</p>
        <p><code>${webhookExample}</code></p>
        <table>
          <thead><tr><th>Case</th><th>Provider Event</th><th>Decision</th><th>Route Result</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </main>
    </body>
  </html>`;
};

const renderTelephonyWebhookDecisionsHTML = () => {
  const decisions = telephonyOutcomeRecorder.list();
  const rows = decisions.length
    ? decisions
        .map(
          (decision) => `<tr>
            <td><strong>${escapeHtml(decision.provider ?? "unknown")}</strong><br /><span class="muted">${escapeHtml(
              new Date(decision.at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "medium",
              }),
            )}</span></td>
            <td><strong>${escapeHtml(decision.action)}</strong><br /><span class="muted">${escapeHtml(decision.source ?? "unknown")} / ${escapeHtml(decision.disposition ?? "none")}</span></td>
            <td><pre>${stringifyForHtml(decision.campaignOutcome)}</pre></td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="3">No webhook decisions recorded yet. Run carrier smoke or campaign dialer proof to populate this view.</td></tr>`;

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Telephony Webhook Decisions</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;background:#0b1020;color:#f8fafc;margin:0}
        main{max-width:1120px;margin:auto;padding:32px}
        a{color:#67e8f9}
        .hero{background:linear-gradient(135deg,rgba(8,145,178,.24),rgba(245,158,11,.14));border:1px solid #263449;border-radius:28px;padding:26px}
        .muted{color:#9ca3af}
        table{width:100%;border-collapse:collapse;background:#111827;border-radius:18px;overflow:hidden;margin-top:20px}
        th,td{border-bottom:1px solid #263449;padding:14px;text-align:left;vertical-align:top}
        pre{background:#0f172a;border:1px solid #263449;border-radius:14px;color:#bae6fd;margin:0;max-width:620px;overflow:auto;padding:12px;white-space:pre-wrap}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/ops-console">Back to Ops Console</a> · <a href="/telephony-outcomes">Outcome policy</a> · <a href="/carriers">Carrier matrix</a> · <a href="/api/telephony-webhook-decisions">JSON</a></p>
        <section class="hero">
          <p class="muted">Carrier webhook telemetry</p>
          <h1>Latest normalized webhook decisions</h1>
          <p class="muted">This view shows what Twilio, Telnyx, and Plivo webhook payloads became after normalization: no-answer, voicemail, transfer, ignored, and campaign outcome application.</p>
        </section>
        <table>
          <thead><tr><th>Provider</th><th>Decision</th><th>Campaign Outcome</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </main>
    </body>
  </html>`;
};

const demoChecklistItems = [
  {
    description:
      "Start with any framework page and complete one guided or general microphone flow.",
    href: "/react",
    label: "Run a framework demo",
  },
  {
    description:
      "Show the single pass/fail control-plane report before talking features.",
    href: "/production-readiness",
    label: "Verify production readiness",
  },
  {
    description:
      "Queue browser or phone recovery proof jobs and watch readiness repair status live.",
    href: "/voice/real-call-profile-recovery",
    label: "Run real-call recovery jobs",
  },
  {
    description:
      "Show the compact gate JSON your own deploy script can check before release.",
    href: "/deploy-gate",
    label: "Explain deploy gate",
  },
  {
    description:
      "Show the optional readiness profiles and the proof surfaces each one expects.",
    href: "/readiness-profiles",
    label: "Compare readiness profiles",
  },
  {
    description:
      "Open the phone-agent and carrier matrix to prove Twilio, Telnyx, and Plivo setup parity.",
    href: "/phone-agent",
    label: "Inspect phone-agent readiness",
  },
  {
    description:
      "Show normalized carrier outcomes from recent webhook smoke checks.",
    href: "/telephony-webhook-decisions",
    label: "Review webhook decisions",
  },
  {
    description:
      "Use traces to show clean per-call timelines with zero warnings or failed sessions.",
    href: "/traces",
    label: "Inspect call traces",
  },
  {
    description:
      "Open saved call artifacts, summaries, tasks, and handoff evidence.",
    href: "/reviews",
    label: "Review call artifacts",
  },
  {
    description:
      "Show the package-level disconnect, resume, and replay-safe reconnect contract.",
    href: "/voice/reconnect-contract",
    label: "Prove reconnect recovery",
  },
  {
    description:
      "Show that provider errors recovered by fallback stay visible in replay but pass readiness.",
    href: "/provider-recovery",
    label: "Prove provider recovery",
  },
  {
    description:
      "Show trace and audit delivery queues, then explain how file sinks swap for webhook, S3, SQLite, or Postgres sinks.",
    href: "/delivery-sinks",
    label: "Inspect delivery sinks",
  },
  {
    description:
      "Close with provider fallback contracts and the simulation suite as proof this is more than a demo.",
    href: "/voice/simulations",
    label: "Show simulation proof",
  },
] satisfies Array<{
  description: string;
  href: string;
  label: string;
}>;

const renderDemoChecklistHTML = () => {
  const rows = demoChecklistItems
    .map(
      (item, index) => `<article>
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <h2><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></h2>
          <p>${escapeHtml(item.description)}</p>
        </div>
      </article>`,
    )
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>AbsoluteJS Voice Demo Checklist</title>
      <style>
        body{background:#10140f;color:#f7f3e8;font-family:ui-sans-serif,system-ui,sans-serif;margin:0}
        main{max-width:1040px;margin:auto;padding:32px}
        a{color:#bef264}
        .hero{background:linear-gradient(135deg,rgba(190,242,100,.2),rgba(14,165,233,.15));border:1px solid #334155;border-radius:30px;margin-bottom:18px;padding:28px}
        .muted{color:#a7b18f}
        .grid{display:grid;gap:14px}
        article{align-items:flex-start;background:#171c15;border:1px solid #2d3727;border-radius:22px;display:grid;gap:16px;grid-template-columns:auto 1fr;padding:18px}
        article span{background:#bef264;border-radius:999px;color:#1a2e05;font-weight:900;padding:8px 10px}
        h1{font-size:clamp(2.3rem,6vw,4.7rem);line-height:.9;margin:.2rem 0 1rem}
        h2{margin:0 0 6px}
        p{line-height:1.6}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/ops-console">Back to Ops Console</a> · <a href="/api/production-readiness">Readiness JSON</a></p>
        <section class="hero">
          <p class="muted">Presentation path</p>
          <h1>Demo AbsoluteJS Voice without hunting for tabs</h1>
          <p class="muted">Run this order when showing self-hosted voice primitives: framework UX, production proof, carrier readiness, webhook normalization, traces, reviews, and simulations.</p>
        </section>
        <section class="grid">${rows}</section>
      </main>
    </body>
  </html>`;
};

export {
  campaignStore,
  demoOutcomeContracts,
  generalWorkflowContract,
  guidedWorkflowContract,
  listIntakes,
  listTelephonyOutcomePreviews,
  persistIntake,
  recordTelephonyWebhookDecision,
  renderCampaignDialerProofHTML,
  renderDemoChecklistHTML,
  renderTelephonyOutcomePreviewHTML,
  renderTelephonyWebhookDecisionsHTML,
  telephonyOutcomePolicy,
  telephonyOutcomeRecorder,
  telephonyWebhookIdempotencyStore,
  transferWorkflowContract,
  workflowScenarios,
};
