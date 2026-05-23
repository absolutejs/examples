import type { SavedIntake, VoiceAgentSquadDemoStatus } from "../types/domain";
import { resolveScenarioFromContext } from "./voiceFlow";
import {
  applyPhraseHintCorrections,
  createVoiceAgent,
  createVoiceAgentSquad,
  createVoiceAgentTool,
  createVoiceMemoryTraceEventStore,
  runVoiceAgentSquadContract,
  type VoiceSessionRecord,
  type VoiceTurnCorrectionHandler,
  type VoiceTurnRecord,
  voice,
} from "@absolutejs/voice";
import { Elysia } from "elysia";
import { escapeHtml } from "./helpers";
import { deliveryTraceStore } from "./providers";

const intakeClassifierTool = createVoiceAgentTool<
  unknown,
  VoiceSessionRecord,
  Record<string, unknown>,
  unknown,
  SavedIntake
>({
  description:
    "Classify whether the caller is in guided or general intake mode.",
  name: "intake_classifier",
  execute: ({ context }) => ({
    mode: resolveScenarioFromContext(context),
  }),
});

const lifecycleRouterTool = createVoiceAgentTool<
  unknown,
  VoiceSessionRecord,
  Record<string, unknown>,
  unknown,
  SavedIntake
>({
  description:
    "Route transfer, escalation, voicemail, and no-answer phrases into call outcomes.",
  name: "lifecycle_router",
  execute: ({ turn }) => ({
    text: turn.text,
  }),
});

const reviewTaskRecorderTool = createVoiceAgentTool<
  unknown,
  VoiceSessionRecord,
  Record<string, unknown>,
  unknown,
  SavedIntake
>({
  description:
    "Expose the runtime stores that record reviews, tasks, and integration events.",
  name: "review_task_recorder",
  execute: () => ({
    events: true,
    reviews: true,
    tasks: true,
  }),
});

const runDemoAgentSquadContract = async () => {
  const trace = createVoiceMemoryTraceEventStore();
  const supportAgent = createVoiceAgent<
    unknown,
    VoiceSessionRecord,
    { queue: string }
  >({
    id: "support",
    model: {
      generate: ({ turn }) =>
        turn.text.toLowerCase().includes("billing")
          ? {
              handoff: {
                metadata: { queue: "billing" },
                reason: "Billing question detected.",
                targetAgentId: "billing",
              },
            }
          : turn.text.toLowerCase().includes("legal")
            ? {
                handoff: {
                  metadata: { queue: "legal" },
                  reason: "Legal question detected.",
                  targetAgentId: "legal",
                },
              }
            : {
                assistantText: "Support can help with this request.",
                result: { queue: "support" },
              },
    },
    system: "Route callers to the correct demo specialist.",
    trace,
  });
  const billingAgent = createVoiceAgent<
    unknown,
    VoiceSessionRecord,
    { queue: string }
  >({
    id: "billing",
    model: {
      generate: () => ({
        assistantText: "Billing can help with your invoice.",
        complete: true,
        result: { queue: "billing" },
      }),
    },
    system: "Handle invoice and billing questions.",
    trace,
  });
  const squad = createVoiceAgentSquad<
    unknown,
    VoiceSessionRecord,
    { queue: string }
  >({
    agents: [supportAgent, billingAgent],
    defaultAgentId: "support",
    id: "demo-front-desk",
    trace,
    handoffPolicy: ({ handoff }) =>
      handoff.targetAgentId === "billing"
        ? {
            metadata: { certifiedRoute: "support-to-billing" },
            summary: "Certified billing route.",
          }
        : {
            allow: false,
            escalate: {
              metadata: {
                requestedSpecialist: handoff.targetAgentId,
              },
              reason: "unsupported-specialist",
            },
            reason: `No certified route for ${handoff.targetAgentId}.`,
          },
  });

  return runVoiceAgentSquadContract({
    context: {},
    contract: {
      description:
        "Proves the demo front desk routes billing callers to the billing specialist.",
      id: "demo-billing-route",
      label: "Demo billing squad route",
      scenarioId: "demo-billing-route",
      turns: [
        {
          expect: {
            assistantIncludes: ["invoice"],
            finalAgentId: "billing",
            handoffs: [
              {
                fromAgentId: "support",
                status: "allowed",
                targetAgentId: "billing",
              },
            ],
            outcome: "complete",
            result: ({ result }) =>
              result?.queue === "billing"
                ? []
                : [
                    {
                      code: "demo_billing_route.queue_mismatch",
                      message: "Expected billing queue result.",
                    },
                  ],
          },
          id: "billing-question",
          text: "I have a billing question about my invoice.",
        },
        {
          expect: {
            finalAgentId: "support",
            handoffs: [
              {
                fromAgentId: "support",
                status: "blocked",
                targetAgentId: "legal",
              },
            ],
            outcome: "escalate",
            result: ({ routeResult }) =>
              routeResult.escalate?.reason === "unsupported-specialist"
                ? []
                : [
                    {
                      code: "demo_unsupported_route.escalation_missing",
                      message:
                        "Expected unsupported specialist route to escalate.",
                    },
                  ],
          },
          id: "unsupported-legal-question",
          text: "I have a legal question about this invoice.",
        },
      ],
    },
    squad,
    trace,
  });
};

const renderAgentSquadContractHTML = async () => {
  const report = await runDemoAgentSquadContract();
  const issueRows = report.issues.length
    ? report.issues
        .map(
          (issue) =>
            `<li><code>${escapeHtml(issue.code)}</code> ${escapeHtml(
              issue.message,
            )}</li>`,
        )
        .join("")
    : "<li>No routing issues.</li>";
  const turnRows = report.turns
    .map(
      (turn) => `<tr>
        <td><code>${escapeHtml(turn.turnId)}</code></td>
        <td>${escapeHtml(turn.agentId)}</td>
        <td>${escapeHtml(turn.outcome ?? "none")}</td>
        <td>${turn.handoffs
          .map(
            (handoff) =>
              `${escapeHtml(handoff.fromAgentId ?? "?")} -> ${escapeHtml(
                handoff.targetAgentId ?? "?",
              )} (${escapeHtml(handoff.status ?? "unknown")})`,
          )
          .join("<br>")}</td>
        <td>${turn.pass ? "Pass" : "Fail"}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Agent squad contract</title>
      <style>
        body{background:#080b12;color:#e5eefb;font-family:Inter,ui-sans-serif,system-ui,sans-serif;margin:0}
        main{max-width:1040px;margin:auto;padding:32px}
        a{color:#93c5fd}
        .pill{border-radius:999px;display:inline-block;font-weight:800;padding:8px 12px;background:${report.pass ? "#14532d" : "#7f1d1d"}}
        .muted{color:#9ca3af}
        table{width:100%;border-collapse:collapse;background:#111827;border-radius:18px;overflow:hidden}
        th,td{border-bottom:1px solid #263244;padding:14px;text-align:left;vertical-align:top}
        code{color:#bfdbfe}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/ops-console">Back to Ops Console</a> · <a href="/api/agent-squad-contract">JSON</a></p>
        <p class="muted">Self-hosted specialist routing proof</p>
        <h1>Agent squad contract</h1>
        <p class="pill">${report.pass ? "Pass" : "Fail"}</p>
        <p class="muted">This page runs <code>runVoiceAgentSquadContract</code> against a deterministic support-to-billing squad. It proves the route graph before live traffic.</p>
        <h2>Turns</h2>
        <table>
          <thead><tr><th>Turn</th><th>Final agent</th><th>Outcome</th><th>Handoffs</th><th>Status</th></tr></thead>
          <tbody>${turnRows}</tbody>
        </table>
        <h2>Issues</h2>
        <ul>${issueRows}</ul>
      </main>
    </body>
  </html>`;
};

const readPayloadString = (
  payload: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = payload?.[key];

  return typeof value === "string" ? value : undefined;
};

const readPayloadNumber = (
  payload: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = payload?.[key];

  return typeof value === "number" ? value : undefined;
};

const buildAgentSquadDemoStatus = async (
  sessionId?: string,
): Promise<VoiceAgentSquadDemoStatus> => {
  if (!sessionId) {
    return {
      contextPolicy: "default",
      currentAgentId: "front-desk",
      handoffCount: 0,
      status: "idle",
    };
  }

  const [contextEvents, handoffEvents] = await Promise.all([
    deliveryTraceStore.list({
      limit: 25,
      sessionId,
      type: "agent.context",
    }),
    deliveryTraceStore.list({
      limit: 25,
      sessionId,
      type: "agent.handoff",
    }),
  ]);
  const latestContext = [...contextEvents].sort(
    (left, right) => right.at - left.at,
  )[0];
  const latestHandoff = [...handoffEvents].sort(
    (left, right) => right.at - left.at,
  )[0];
  const contextPayload = latestContext?.payload;
  const handoffPayload = latestHandoff?.payload;
  const latestEvent = [latestContext, latestHandoff]
    .filter(Boolean)
    .sort((left, right) => (right?.at ?? 0) - (left?.at ?? 0))[0];

  if (!latestEvent) {
    return {
      contextPolicy: "default",
      currentAgentId: "front-desk",
      handoffCount: 0,
      status: "idle",
    };
  }

  return {
    at: latestEvent.at,
    contextPolicy:
      readPayloadString(contextPayload, "status") === "applied"
        ? "handoff-summary-current-turn"
        : "default",
    currentAgentId:
      readPayloadString(contextPayload, "targetAgentId") ??
      readPayloadString(handoffPayload, "targetAgentId") ??
      "front-desk",
    handoffCount: handoffEvents.length,
    lastHandoff: latestHandoff
      ? {
          fromAgentId: readPayloadString(handoffPayload, "fromAgentId"),
          reason: readPayloadString(handoffPayload, "reason"),
          status: readPayloadString(handoffPayload, "status"),
          summary: readPayloadString(handoffPayload, "summary"),
          targetAgentId: readPayloadString(handoffPayload, "targetAgentId"),
        }
      : undefined,
    messageCount: readPayloadNumber(contextPayload, "nextMessageCount"),
    sessionId: latestEvent.sessionId,
    status: "active",
  };
};

const agentSquadStatusRoutes = new Elysia().get(
  "/api/agent-squad/status",
  ({ query }) =>
    buildAgentSquadDemoStatus(
      typeof query.sessionId === "string" ? query.sessionId : undefined,
    ),
);

const createContractTurn = (
  id: string,
  text: string,
): VoiceTurnRecord<SavedIntake> => ({
  committedAt: Date.now(),
  id,
  text,
  transcripts: [],
});

const correctDemoTurn: VoiceTurnCorrectionHandler<
  unknown,
  VoiceSessionRecord,
  SavedIntake
> = async ({ phraseHints, text }) => {
  const result = applyPhraseHintCorrections(text, phraseHints);

  if (!result.changed) {
    return;
  }

  return {
    metadata:
      result.matches.length > 0
        ? {
            matchedAliases: result.matches.map((match) => match.alias),
            matchedHints: result.matches.map((match) => match.hint.text),
          }
        : undefined,
    provider: "absolutejs-voice-example",
    reason: "demo-phrase-hint-correction",
    text: result.text,
  };
};

export {
  agentSquadStatusRoutes,
  correctDemoTurn,
  createContractTurn,
  intakeClassifierTool,
  lifecycleRouterTool,
  renderAgentSquadContractHTML,
  reviewTaskRecorderTool,
  runDemoAgentSquadContract,
};
