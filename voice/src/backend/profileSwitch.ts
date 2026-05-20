import {
  VOICE_ASSISTANT_CONFIG,
  type SavedIntake,
  type VoiceModelProvider,
} from "../shared/demo";
import { type SavedVoiceIntegrationEvent } from "./integrationsPage";
import { type SavedVoiceOpsTask } from "./opsPage";
import { buildSavedVoiceReview } from "./reviewPage";
import {
  VOICE_DEMO_PHRASE_HINTS,
  buildSavedIntake,
  resolveScenarioFromContext,
} from "./voiceFlow";
import {
  VOICE_LIVE_OPS_ACTIONS,
  assignVoiceOpsTask,
  completeVoiceOpsTask,
  createVoiceAssistant,
  createVoiceAuditEvent,
  createVoiceExperiment,
  createVoiceProductionReadinessRoutes,
  createVoiceProviderDecisionTraceEvent,
  createVoiceReadinessProfile,
  createVoiceTaskUpdatedEvent,
  evaluateVoiceProviderStackGaps,
  recommendVoiceProviderStack,
  recommendVoiceReadinessProfile,
  reopenVoiceOpsTask,
  startVoiceOpsTask,
  type StoredVoiceTraceEvent,
  type VoiceAgentModel,
  type VoiceAssistantMemoryRecord,
  type VoiceCallReviewStore,
  type VoiceLiveOpsAction,
  type VoiceLiveOpsControlState,
  type VoiceOpsTaskStatus,
  type VoiceOpsTaskStore,
  type VoiceSessionRecord,
  type VoiceTraceEvent,
  type VoiceTraceEventStore,
  voice,
} from "@absolutejs/voice";
import { deepgram } from "@absolutejs/voice-deepgram";
import { gemini } from "@absolutejs/voice-gemini";
import { openai } from "@absolutejs/voice-openai";
import {
  intakeClassifierTool,
  lifecycleRouterTool,
  reviewTaskRecorderTool,
} from "./agentSquad";
import {
  deliverIntegrationEvent,
  loadCarrierMatrixInputs,
} from "./carrierHandoff";
import { escapeHtml } from "./helpers";
import {
  runDemoSTTProviderRoutingContract,
  runDemoTTSProviderRoutingContract,
} from "./observabilityExport";
import { deliveryRuntimeControl } from "./proofSeeds";
import {
  buildDemoProviderContractMatrix,
  configuredModelProviders,
  configuredSTTProviders,
  configuredTTSProviders,
  deliveryTraceStore,
  demoLiveGuardrails,
  geminiApiKey,
  modelProvider,
  openAIApiKey,
  runDemoProviderRoutingContract,
  voiceProviderStackCapabilities,
} from "./providers";
import { readinessProfileCards } from "./readinessReports";
import { assistantModel } from "./realCallEvidence";
import {
  demoIncidentSessionId,
  hiddenTraceTimelineSessionPattern,
  memoryStore,
  runtimeStorage,
} from "./stores";

const renderReadinessProfilesHTML = () => {
  const recommendation = recommendVoiceReadinessProfile({
    auditDeliveries: runtimeStorage.auditDeliveries,
    carriers: loadCarrierMatrixInputs,
    deliveryRuntime: deliveryRuntimeControl,
    providerRoutingContracts: async () => [
      await runDemoProviderRoutingContract(),
      await runDemoSTTProviderRoutingContract(),
      await runDemoTTSProviderRoutingContract(),
    ],
    traceDeliveries: runtimeStorage.traceDeliveries,
  });
  const providerStack = recommendVoiceProviderStack({
    profile: recommendation.profile,
    providers: {
      llm: configuredModelProviders,
      stt: configuredSTTProviders,
      tts: configuredTTSProviders,
    },
  });
  const providerStackGaps = evaluateVoiceProviderStackGaps({
    capabilities: voiceProviderStackCapabilities,
    profile: recommendation.profile,
    providers: {
      llm: configuredModelProviders,
      stt: configuredSTTProviders,
      tts: configuredTTSProviders,
    },
    recommendation: providerStack,
  });
  const providerContractMatrix = buildDemoProviderContractMatrix();
  const providerRows = (["llm", "stt", "tts"] as const)
    .map((kind) => {
      const stack = providerStack.stacks[kind];
      const gap = providerStackGaps.gaps.find((entry) => entry.kind === kind);
      const provider = stack?.provider
        ? escapeHtml(stack.provider)
        : "not configured";
      const alternatives = stack?.alternatives.length
        ? stack.alternatives
            .map((alternative) => escapeHtml(alternative))
            .join(", ")
        : "none";
      const reasons = stack?.reasons.length
        ? stack.reasons.map((reason) => escapeHtml(reason)).join("<br />")
        : "";
      const missing = gap?.missing.length
        ? gap.missing.map((capability) => escapeHtml(capability)).join(", ")
        : "covered";

      return `<tr>
        <td><strong>${kind.toUpperCase()}</strong></td>
        <td>${provider}</td>
        <td>${alternatives}</td>
        <td>${reasons}</td>
        <td>${missing}</td>
      </tr>`;
    })
    .join("");
  const contractRows = providerContractMatrix.rows
    .map((row) => {
      const issues = row.checks
        .filter((check) => check.status !== "pass")
        .map((check) => `${check.label}: ${check.detail ?? check.status}`)
        .join("<br />");

      return `<tr>
        <td><strong>${escapeHtml(row.kind.toUpperCase())}</strong></td>
        <td>${escapeHtml(row.provider)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${row.selected ? "yes" : "no"}</td>
        <td>${issues || "covered"}</td>
      </tr>`;
    })
    .join("");
  const cards = readinessProfileCards
    .map((profile) => {
      const surfaces = profile.surfaces
        .map(
          (surface) =>
            `<li><a href="${escapeHtml(surface.href)}">${escapeHtml(surface.label)}</a></li>`,
        )
        .join("");

      return `<article>
        <p class="eyebrow">${escapeHtml(profile.name)}</p>
        <h2><code>${escapeHtml(profile.name)}</code></h2>
        <p>${escapeHtml(profile.description)}</p>
        <h3>Expected proof surfaces</h3>
        <ul>${surfaces}</ul>
      </article>`;
    })
    .join("");
  const example = escapeHtml(`createVoiceProductionReadinessRoutes({
  ...createVoiceReadinessProfile("phone-agent", {
    auditDeliveries: runtime.auditDeliveries,
    carriers: loadCarrierMatrixInputs,
    deliveryRuntime,
    traceDeliveries: runtime.traceDeliveries,
  }),
  store: runtime.traces,
})`);
  const reasons =
    recommendation.reasons.length > 0
      ? recommendation.reasons
          .map((reason) => `<li>${escapeHtml(reason)}</li>`)
          .join("")
      : "<li>No strong surface signals yet.</li>";
  const missing =
    recommendation.missing.length > 0
      ? recommendation.missing
          .map((key) => `<code>${escapeHtml(key)}</code>`)
          .join(", ")
      : "none";

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>AbsoluteJS Voice Readiness Profiles</title>
      <style>
        body{background:#11140f;color:#f7f3e8;font-family:ui-sans-serif,system-ui,sans-serif;margin:0}
        main{max-width:1180px;margin:auto;padding:32px}
        a{color:#bef264}
        .hero{background:linear-gradient(135deg,rgba(190,242,100,.18),rgba(125,211,252,.14));border:1px solid #324128;border-radius:30px;margin-bottom:18px;padding:28px}
        .eyebrow{color:#bef264;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        h1{font-size:clamp(2.4rem,6vw,4.9rem);line-height:.9;margin:.2rem 0 1rem}
        .muted{color:#aab899}
        .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
        article,pre{background:#181f15;border:1px solid #304028;border-radius:22px;padding:18px}
        article h2{margin:.2rem 0}
        article p{line-height:1.55}
        .recommendation{background:#1f2a18;border:1px solid #4d7c0f;border-radius:24px;margin-bottom:18px;padding:20px}
        table{border-collapse:collapse;margin-top:14px;width:100%}
        th,td{border-top:1px solid #405633;padding:12px;text-align:left;vertical-align:top}
        th{color:#bef264;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase}
        li{margin:8px 0}
        code{color:#d9f99d}
        pre{overflow:auto}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/ops-console">Back to Ops Console</a> · <a href="/production-readiness">Production readiness</a> · <a href="/deploy-gate">Deploy gate</a></p>
        <section class="hero">
          <p class="eyebrow">Optional primitives, not an app kit</p>
          <h1>Choose a readiness profile, then override anything</h1>
          <p class="muted">Profiles return spreadable options for <code>createVoiceProductionReadinessRoutes</code>. They do not mount routes, create stores, start workers, or prescribe a workflow.</p>
        </section>
        <section class="recommendation">
          <p class="eyebrow">Recommended for this demo</p>
          <h2><code>${escapeHtml(recommendation.profile)}</code> · ${Math.round(recommendation.confidence * 100)}% match</h2>
          <p class="muted">This recommendation comes from the proof surfaces currently configured in the example.</p>
          <ul>${reasons}</ul>
          <p class="muted">Missing for a fuller match: ${missing}</p>
        </section>
        <section class="recommendation">
          <p class="eyebrow">Recommended provider stack</p>
          <h2><code>${escapeHtml(providerStack.profile)}</code> provider fit</h2>
          <p class="muted">This chooses from the providers configured in this example and explains why the profile prefers each lane.</p>
          <table>
            <thead>
              <tr>
                <th>Lane</th>
                <th>Recommended</th>
                <th>Configured</th>
                <th>Why</th>
                <th>Capability gaps</th>
              </tr>
            </thead>
            <tbody>${providerRows}</tbody>
          </table>
        </section>
        <section class="recommendation">
          <p class="eyebrow">Provider contract matrix</p>
          <h2>${providerContractMatrix.passed}/${providerContractMatrix.total} provider rows production-ready</h2>
          <p class="muted">This matrix checks required env, latency budget, fallback, streaming, and declared capabilities for each configured provider lane.</p>
          <table>
            <thead>
              <tr>
                <th>Lane</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Selected</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>${contractRows}</tbody>
          </table>
        </section>
        <section class="grid">${cards}</section>
        <h2>Shape of the API</h2>
        <pre>${example}</pre>
      </main>
    </body>
  </html>`;
};

const listAssistantMemory = async (): Promise<VoiceAssistantMemoryRecord[]> =>
  memoryStore.list({
    assistantId: VOICE_ASSISTANT_CONFIG.id,
  });

const getTask = async (taskId: string): Promise<SavedVoiceOpsTask | null> =>
  (await runtimeStorage.tasks.get(taskId)) ?? null;

const emitTaskUpdatedEvent = async (task: SavedVoiceOpsTask) => {
  await deliverIntegrationEvent(
    createVoiceTaskUpdatedEvent(task) as SavedVoiceIntegrationEvent,
  );
};

const updateTaskStatus = async (
  taskId: string,
  input: {
    actor: string;
    detail?: string;
    status: VoiceOpsTaskStatus;
  },
) => {
  const task = await getTask(taskId);

  if (!task) {
    return null;
  }

  const updatedTask = (
    input.status === "in-progress"
      ? startVoiceOpsTask(task, {
          actor: input.actor,
          detail: input.detail,
        })
      : input.status === "done"
        ? completeVoiceOpsTask(task, {
            actor: input.actor,
            detail: input.detail,
          })
        : reopenVoiceOpsTask(task, {
            actor: input.actor,
            detail: input.detail,
          })
  ) as SavedVoiceOpsTask;

  await runtimeStorage.tasks.set(updatedTask.id, updatedTask);
  await emitTaskUpdatedEvent(updatedTask);
  return updatedTask;
};

const assignTask = async (taskId: string, owner: string) => {
  const task = await getTask(taskId);

  if (!task) {
    return null;
  }

  const updatedTask = assignVoiceOpsTask(task, owner) as SavedVoiceOpsTask;
  await runtimeStorage.tasks.set(updatedTask.id, updatedTask);
  await emitTaskUpdatedEvent(updatedTask);
  return updatedTask;
};

const liveOpsActions = VOICE_LIVE_OPS_ACTIONS;

const isLiveOpsAction = (value: unknown): value is VoiceLiveOpsAction =>
  typeof value === "string" &&
  liveOpsActions.includes(value as VoiceLiveOpsAction);

const liveOpsSessionControls = new Map<string, VoiceLiveOpsControlState>();

const redirectToTasks = () =>
  new Response(null, {
    headers: {
      Location: "/tasks",
    },
    status: 302,
  });

const liveOpsRuntime = {
  getControl: (sessionId: string) => liveOpsSessionControls.get(sessionId),
};

const createDemoAssistant = (
  provider: VoiceModelProvider,
  model: VoiceAgentModel<unknown, VoiceSessionRecord, SavedIntake>,
) =>
  createVoiceAssistant<unknown, VoiceSessionRecord, SavedIntake>({
    artifactPlan: {
      ops: {
        buildReview: ({ result, session }) =>
          buildSavedVoiceReview({
            phraseHints: VOICE_DEMO_PHRASE_HINTS,
            result: result ?? buildSavedIntake(session),
            session,
          }),
        events: runtimeStorage.events,
        onEvent: async ({ event }) => {
          await deliverIntegrationEvent(event as SavedVoiceIntegrationEvent);
        },
        reviews: runtimeStorage.reviews as unknown as VoiceCallReviewStore,
        tasks: runtimeStorage.tasks as unknown as VoiceOpsTaskStore,
      },
      preset: {
        name: "support-triage",
        options: {
          assignee: "support-oncall",
          escalationAssignee: "support-lead",
          escalationQueue: "support-escalations",
          queue: "support-triage",
        },
      },
    },
    experiment: createVoiceExperiment({
      id: "support-copy",
      variants: [
        {
          id: provider,
          weight: 1,
        },
        {
          id: "direct",
          system:
            "Use direct support copy. If the caller is in general recording mode, capture one freeform turn and return complete true. If the caller asks for transfer, escalation, voicemail, or no answer, route that exact lifecycle outcome.",
          weight: 1,
        },
      ],
    }),
    guardrails: {
      beforeTurn: async (input) => {
        const turn = input.turn ?? {
          id: `guardrail-turn-${Date.now()}`,
          text: "",
        };
        const guardrailInput = {
          ...input,
          turn,
        };
        const guardrailResult =
          await demoLiveGuardrails.assistantGuardrails.beforeTurn?.(
            guardrailInput,
          );
        if (guardrailResult) {
          return guardrailResult;
        }

        return /\b(human|agent|supervisor|manager)\b/i.test(turn.text) &&
          /\b(please|need|want|get|talk|speak)\b/i.test(turn.text)
          ? {
              assistantText: "Escalating this call for human follow-up.",
              escalate: {
                reason: "caller-requested-human",
              },
              result: buildSavedIntake(
                input.session,
                resolveScenarioFromContext(input.context),
              ),
            }
          : undefined;
      },
      afterTurn: demoLiveGuardrails.assistantGuardrails.afterTurn,
    },
    id: "support",
    memory: {
      namespace: ({ session }) => session.id,
      store: memoryStore,
    },
    memoryLifecycle: {
      afterTurn: async ({ memory, result, session }) => {
        const savedIntake = result.result ?? buildSavedIntake(session);

        if (savedIntake.detectedName) {
          await memory.set("caller.name", savedIntake.detectedName);
        }

        if (savedIntake.callDisposition) {
          await memory.set("lastOutcome", savedIntake.callDisposition);
        }
      },
      beforeTurn: async ({ memory }) => {
        await memory.get("caller.name");
        await memory.get("lastOutcome");
      },
    },
    model,
    system:
      "Use baseline guide copy. If the caller is in general recording mode, capture one freeform turn and return complete true. If the caller is in guided mode, ask the next concise guided question until the guided prompts are complete. If the caller asks for transfer, escalation, voicemail, or no answer, route that exact lifecycle outcome.",
    tools: demoLiveGuardrails.wrapTools([
      intakeClassifierTool,
      lifecycleRouterTool,
      reviewTaskRecorderTool,
    ]),
    trace: runtimeStorage.traces,
  });

const assistant = createDemoAssistant(modelProvider, assistantModel);

const filterDemoTraceTimelineEvents = (
  events: StoredVoiceTraceEvent[],
): StoredVoiceTraceEvent[] => {
  const eventsBySession = new Map<string, StoredVoiceTraceEvent[]>();
  for (const event of events) {
    eventsBySession.set(event.sessionId, [
      ...(eventsBySession.get(event.sessionId) ?? []),
      event,
    ]);
  }

  const visibleSessionIds = new Set(
    [...eventsBySession.entries()]
      .filter(([sessionId, sessionEvents]) => {
        if (
          sessionId === "live-session-now" ||
          hiddenTraceTimelineSessionPattern.test(sessionId)
        ) {
          return false;
        }

        return sessionEvents.some(
          (event) =>
            event.type === "call.lifecycle" ||
            event.type === "turn.assistant" ||
            event.type === "turn.committed" ||
            event.type === "turn.transcript",
        );
      })
      .map(([sessionId]) => sessionId),
  );

  return events.filter((event) => visibleSessionIds.has(event.sessionId));
};

const traceTimelineStore: VoiceTraceEventStore = {
  append: (event) => deliveryTraceStore.append(event),
  get: (id) => deliveryTraceStore.get(id),
  list: async (filter) =>
    filterDemoTraceTimelineEvents(await deliveryTraceStore.list(filter)),
  remove: (id) => deliveryTraceStore.remove(id),
};

const ensureDemoIncidentBundleEvidence = async () => {
  const existing = await runtimeStorage.traces.list({
    sessionId: demoIncidentSessionId,
  });

  const at = Date.now() - 2_400;
  const appendTrace = (event: VoiceTraceEvent) =>
    deliveryTraceStore.append(event);

  if (existing.length === 0) {
    await appendTrace({
      at,
      metadata: {
        proof: "incident-bundle-seed",
        source: "demo",
      },
      payload: {
        status: "started",
      },
      sessionId: demoIncidentSessionId,
      type: "call.lifecycle",
    });
    await appendTrace({
      at: at + 300,
      metadata: {
        proof: "incident-bundle-seed",
        source: "demo",
      },
      payload: {
        isFinal: true,
        text: "My email is demo.customer@example.com and I need billing help.",
      },
      sessionId: demoIncidentSessionId,
      traceId: "demo-incident-transcript",
      turnId: "demo-incident-turn-1",
      type: "turn.transcript",
    });
    await appendTrace({
      at: at + 520,
      metadata: {
        proof: "incident-bundle-seed",
        source: "demo",
      },
      payload: {
        text: "My email is demo.customer@example.com and I need billing help.",
      },
      sessionId: demoIncidentSessionId,
      turnId: "demo-incident-turn-1",
      type: "turn.committed",
    });
    await appendTrace({
      at: at + 760,
      metadata: {
        proof: "incident-bundle-seed",
        source: "demo",
      },
      payload: {
        fromAgentId: "intake",
        reason: "billing_request",
        status: "allowed",
        summary:
          "Customer needs billing support for account demo.customer@example.com.",
        targetAgentId: "billing",
      },
      sessionId: demoIncidentSessionId,
      turnId: "demo-incident-turn-1",
      type: "agent.handoff",
    });
    await appendTrace({
      at: at + 980,
      metadata: {
        proof: "incident-bundle-seed",
        source: "demo",
      },
      payload: {
        elapsedMs: 87,
        status: "success",
        toolCallId: "demo-lookup-invoice",
        toolName: "lookup_invoice",
      },
      sessionId: demoIncidentSessionId,
      turnId: "demo-incident-turn-1",
      type: "agent.tool",
    });
    await appendTrace({
      at: at + 1_220,
      metadata: {
        proof: "incident-bundle-seed",
        source: "demo",
      },
      payload: {
        text: "I found the invoice and can connect you with billing.",
      },
      sessionId: demoIncidentSessionId,
      turnId: "demo-incident-turn-1",
      type: "turn.assistant",
    });
    await appendTrace({
      at: at + 1_500,
      metadata: {
        proof: "incident-bundle-seed",
        source: "demo",
      },
      payload: {
        status: "completed",
      },
      sessionId: demoIncidentSessionId,
      type: "call.lifecycle",
    });
    await runtimeStorage.audit.append(
      createVoiceAuditEvent({
        action: "incident.bundle.demo.seeded",
        actor: {
          id: "absolutejs-voice-demo",
          kind: "system",
          name: "AbsoluteJS Voice Demo",
        },
        at: at + 1_700,
        metadata: {
          proof: "incident-bundle-seed",
          source: "demo",
        },
        outcome: "success",
        payload: {
          note: "Support export can redact demo.customer@example.com from traces and audit.",
        },
        resource: {
          id: demoIncidentSessionId,
          type: "voice.incident_bundle",
        },
        sessionId: demoIncidentSessionId,
        type: "operator.action",
      }),
    );
  }

  const hasGuardrailEvidence = existing.some(
    (event) =>
      event.type === "assistant.guardrail" &&
      event.metadata?.proof === "operations-record-guardrail-seed",
  );

  if (!hasGuardrailEvidence) {
    await appendTrace({
      at: at + 1_060,
      metadata: {
        proof: "operations-record-guardrail-seed",
        source: "demo",
      },
      payload: {
        allowed: false,
        findings: [
          {
            action: "block",
            label: "Unsafe medical claim",
            ruleId: "support.no-medical-advice",
          },
        ],
        stage: "assistant-output",
        status: "fail",
      },
      sessionId: demoIncidentSessionId,
      turnId: "demo-incident-turn-1",
      type: "assistant.guardrail",
    });
    await appendTrace({
      at: at + 1_100,
      metadata: {
        proof: "operations-record-guardrail-seed",
        source: "demo",
      },
      payload: {
        allowed: false,
        findings: [
          {
            action: "block",
            label: "Unsafe tool argument",
            ruleId: "support.tool-input-policy",
          },
        ],
        stage: "tool-input",
        status: "fail",
        toolName: "lookup_invoice",
      },
      sessionId: demoIncidentSessionId,
      turnId: "demo-incident-turn-1",
      type: "assistant.guardrail",
    });
  }

  const latest = await runtimeStorage.traces.list({
    sessionId: demoIncidentSessionId,
  });
  const hasProviderDecisionEvidence = (status: string) =>
    latest.some(
      (event) =>
        event.type === "provider.decision" &&
        event.payload.status === status &&
        event.metadata?.proof === "operations-record-provider-decision-seed",
    );

  if (!hasProviderDecisionEvidence("selected")) {
    await appendTrace({
      ...createVoiceProviderDecisionTraceEvent({
        at: at + 1_030,
        elapsedMs: 320,
        kind: "llm",
        provider: modelProvider,
        reason:
          "live-call selected the configured model provider for the billing support turn.",
        scenarioId: "operations-record-provider-decision-seed",
        selectedProvider: modelProvider,
        sessionId: demoIncidentSessionId,
        status: "selected",
        surface: "live-call",
        turnId: "demo-incident-turn-1",
      }),
      metadata: {
        proof: "operations-record-provider-decision-seed",
        source: "demo",
      },
    });
  }
  if (!hasProviderDecisionEvidence("fallback")) {
    await appendTrace({
      ...createVoiceProviderDecisionTraceEvent({
        at: at + 1_040,
        elapsedMs: 520,
        fallbackProvider:
          modelProvider === "openai" ? "anthropic" : modelProvider,
        kind: "llm",
        provider: modelProvider,
        reason:
          "live-call recovered with the configured fallback provider after a simulated primary model timeout.",
        scenarioId: "operations-record-provider-decision-seed",
        selectedProvider:
          modelProvider === "openai" ? "anthropic" : modelProvider,
        sessionId: demoIncidentSessionId,
        status: "fallback",
        surface: "live-call",
        turnId: "demo-incident-turn-1",
      }),
      metadata: {
        proof: "operations-record-provider-decision-seed",
        source: "demo",
      },
    });
  }
  if (!hasProviderDecisionEvidence("degraded")) {
    await appendTrace({
      ...createVoiceProviderDecisionTraceEvent({
        at: at + 1_050,
        elapsedMs: 980,
        fallbackProvider: "deterministic",
        kind: "llm",
        provider: modelProvider,
        reason:
          "live-call degraded to deterministic fallback after model providers exceeded the latency budget.",
        scenarioId: "operations-record-provider-decision-seed",
        selectedProvider: "deterministic",
        sessionId: demoIncidentSessionId,
        status: "degraded",
        surface: "live-call",
        turnId: "demo-incident-turn-1",
      }),
      metadata: {
        proof: "operations-record-provider-decision-seed",
        source: "demo",
      },
    });
  }

  const reviewId = `${demoIncidentSessionId}:review`;
  if (!(await runtimeStorage.reviews.get(reviewId))) {
    await runtimeStorage.reviews.set(reviewId, {
      config: {
        phraseHints: VOICE_DEMO_PHRASE_HINTS.map((hint) => hint.text),
        preset: "reliability",
        stt: {
          model: "flux-general-en",
          provider: "deepgram",
        },
      },
      errors: [],
      generatedAt: at + 1_800,
      id: reviewId,
      intakeId: reviewId,
      latencyBreakdown: [
        {
          label: "first turn",
          valueMs: 520,
        },
      ],
      notes: [
        "Demo post-call analysis seed.",
        "Extracted category: billing.",
        "Follow-up task and integration event are intentionally persisted.",
      ],
      postCall: {
        label: "Billing support follow-up",
        recommendedAction:
          "Create a billing support task and send the summary to the customer-owned workflow sink.",
        reason: "billing_request",
        summary:
          "Customer asked for billing help and should be routed to billing support.",
        target: "customer-1",
      },
      scenarioId: "guided",
      sessionId: demoIncidentSessionId,
      summary: {
        elapsedMs: 1_500,
        firstTurnLatencyMs: 520,
        outcome: "completed",
        pass: true,
        turnCount: 1,
      },
      timeline: [
        {
          atMs: 300,
          event: "transcript",
          source: "turn",
          text: "My email is demo.customer@example.com and I need billing help.",
        },
        {
          atMs: 1_220,
          event: "assistant",
          source: "turn",
          text: "I found the invoice and can connect you with billing.",
        },
      ],
      title: "Demo billing support review",
      transcript: {
        actual:
          "My email is demo.customer@example.com and I need billing help.",
      },
    });
  }

  const taskId = `${reviewId}:support-triage`;
  if (!(await runtimeStorage.tasks.get(taskId))) {
    await runtimeStorage.tasks.set(taskId, {
      createdAt: at + 1_900,
      description:
        "Post-call analysis classified the demo incident as billing support.",
      history: [
        {
          actor: "absolutejs-voice-demo",
          at: at + 1_900,
          detail: "Created by deterministic post-call analysis proof seed.",
          type: "created",
        },
      ],
      id: taskId,
      intakeId: reviewId,
      kind: "support-triage",
      outcome: "completed",
      priority: "normal",
      queue: "billing-support",
      recommendedAction:
        "Review the billing issue and follow up with the customer.",
      reviewId,
      status: "open",
      target: "customer-1",
      title: "Follow up billing support demo incident",
      updatedAt: at + 1_900,
    });
  }

  const eventId = `${reviewId}:post-call-analysis-delivered`;
  if (!(await runtimeStorage.events.get(eventId))) {
    await runtimeStorage.events.set(eventId, {
      createdAt: at + 2_000,
      deliveredAt: at + 2_050,
      deliveredTo: "customer-owned-workflow",
      deliveryAttempts: 1,
      deliveryStatus: "delivered",
      id: eventId,
      payload: {
        category: "billing",
        customerId: "customer-1",
        reviewId,
        sessionId: demoIncidentSessionId,
        summary: "Billing support follow-up created.",
      },
      sinkDeliveries: {
        "customer-owned-workflow": {
          attempts: 1,
          deliveredAt: at + 2_050,
          deliveredTo: "customer-owned-workflow",
          sinkId: "customer-owned-workflow",
          sinkKind: "webhook",
          status: "delivered",
        },
      },
      type: "task.created",
    });
  }
};

const geminiRealtime = geminiApiKey
  ? gemini({
      apiKey: geminiApiKey,
      instructions:
        "Speak like a concise product demo assistant for AbsoluteJS Voice. Keep replies short, natural, and useful.",
      model:
        process.env.GEMINI_REALTIME_MODEL ??
        "gemini-2.5-flash-native-audio-preview-12-2025",
      voiceName: process.env.GEMINI_REALTIME_VOICE ?? "Puck",
    })
  : undefined;

const openAIRealtime = openAIApiKey
  ? openai({
      apiKey: openAIApiKey,
      instructions:
        "Speak like a concise product demo assistant for AbsoluteJS Voice. Keep replies short, natural, and useful.",
      model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime",
      voice: process.env.OPENAI_REALTIME_VOICE ?? "marin",
    })
  : undefined;

export {
  assignTask,
  assistant,
  createDemoAssistant,
  emitTaskUpdatedEvent,
  ensureDemoIncidentBundleEvidence,
  filterDemoTraceTimelineEvents,
  geminiRealtime,
  getTask,
  isLiveOpsAction,
  listAssistantMemory,
  liveOpsActions,
  liveOpsRuntime,
  liveOpsSessionControls,
  openAIRealtime,
  redirectToTasks,
  renderReadinessProfilesHTML,
  traceTimelineStore,
  updateTaskStatus,
};
