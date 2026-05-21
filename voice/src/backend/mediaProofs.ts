import { type SavedIntake } from "../shared/demo";
import { type SavedVoiceIntegrationEvent } from "./integrationsPage";
import { type SavedVoiceOpsTask } from "./opsPage";
import { buildSavedVoiceReview } from "./reviewPage";
import { VOICE_DEMO_PHRASE_HINTS, buildSavedIntake } from "./voiceFlow";
import {
  createMediaFrame,
  createMediaProcessorGraph,
  createMediaTransport,
  type MediaFrame,
} from "@absolutejs/media";
import {
  buildVoiceFailureReplay,
  buildVoiceLiveOpsControlState,
  buildVoiceMediaPipelineReport,
  buildVoiceOperationsRecord,
  buildVoiceRealtimeChannelReport,
  buildVoiceRealtimeChannelRuntimeSamplesFromTrace,
  createVoiceAuditEvent,
  createVoiceRealtimeProviderContractMatrixPreset,
  recordVoiceRuntimeOps,
  type StoredVoiceTraceEvent,
  type VoiceCallReviewStore,
  type VoiceLiveOpsAction,
  type VoiceOpsTaskStore,
  type VoiceTraceEventStore,
  voice,
} from "@absolutejs/voice";
import { gemini } from "@absolutejs/voice-gemini";
import { openai } from "@absolutejs/voice-openai";
import { Elysia } from "elysia";
import { appendProofTrace, deliverIntegrationEvent } from "./carrierHandoff";
import {
  assistant,
  emitTaskUpdatedEvent,
  geminiRealtime,
  isLiveOpsAction,
  liveOpsSessionControls,
  openAIRealtime,
} from "./profileSwitch";
import { createProofSession, toStringValue } from "./proofSeeds";
import {
  deliveryTraceStore,
  geminiApiKey,
  realtimeChannelFormat,
} from "./providers";
import {
  demoIncidentSessionId,
  handoffDeliveryStore,
  runtimeStorage,
  voiceSupportArtifactRedaction,
} from "./stores";
import type { ProofCallDisposition } from "./proofSeeds";

const opsSurfaceLinks = [
  { href: "/react", label: "Back to demo" },
  {
    description:
      "Step-by-step route through the strongest demo proof surfaces.",
    href: "/demo-checklist",
    label: "Demo Checklist",
    statusHref: "/api/production-readiness",
  },
  {
    description:
      "Map Vapi dashboard concepts to self-hosted AbsoluteJS Voice primitives and proof URLs.",
    href: "/switching-from-vapi",
    label: "Switching From Vapi",
    statusHref: "/api/production-readiness",
  },
  {
    description:
      "Machine-readable proof coverage for Vapi replacement surfaces.",
    href: "/api/voice/platform-coverage",
    label: "Vapi Coverage API",
    statusHref: "/api/voice/platform-coverage",
  },
  {
    description:
      "Compact deploy-gate JSON and stable issue codes for release checks.",
    href: "/deploy-gate",
    label: "Deploy Gate",
    statusHref: "/api/production-readiness/gate",
  },
  {
    description:
      "Queue real-call profile recovery proof jobs and poll their status.",
    href: "/voice/real-call-profile-recovery",
    label: "Real-Call Recovery Jobs",
    statusHref: "/api/voice/real-call-profile-history/actions",
  },
  {
    description:
      "Optional profile presets for meeting recorders, phone agents, and ops-heavy deployments.",
    href: "/readiness-profiles",
    label: "Readiness Profiles",
    statusHref: "/api/production-readiness",
  },
  {
    description: "Integrated voice operations console.",
    href: "/ops-console",
    label: "Ops Console",
  },
  {
    description: "Acceptance gates for production readiness.",
    href: "/quality",
    label: "Quality",
    statusHref: "/quality/status",
  },
  {
    description:
      "Replay stored sessions against quality gates and trend regressions.",
    href: "/evals",
    label: "Evals",
    statusHref: "/evals/status",
  },
  {
    description: "Compare current evals against a saved known-good baseline.",
    href: "/evals/baseline",
    label: "Eval Baseline",
    statusHref: "/evals/baseline/status",
  },
  {
    description:
      "Business-workflow evals for guided recordings, general captures, and transfer handoffs.",
    href: "/evals/scenarios",
    label: "Scenario Evals",
    statusHref: "/evals/scenarios/status",
  },
  {
    description:
      "One pre-production proof report for sessions, scenarios, fixtures, tools, and outcomes.",
    href: "/voice/simulations",
    label: "Simulation Suite",
    statusHref: "/api/voice/simulations",
  },
  {
    description:
      "Single control plane for audit and trace delivery worker summaries and manual ticks.",
    href: "/delivery-runtime",
    label: "Delivery Runtime",
    statusHref: "/api/voice-delivery-runtime",
  },
  {
    description:
      "Unified recovery signal for provider fallback, delivery queues, handoffs, live ops, and latency SLOs.",
    href: "/ops-recovery",
    label: "Ops Recovery",
    statusHref: "/api/voice/ops-recovery",
  },
  {
    description:
      "Customer-owned export manifest for traces, audits, operations records, SLOs, readiness, incidents, and proof artifacts.",
    href: "/voice/observability-export",
    label: "Observability Export",
    statusHref: "/api/voice/observability-export",
  },
  {
    description:
      "Shows whether the latest proof pack is fresh, stale, refreshing in the background, missing, or failed.",
    href: "/api/voice/proof-pack",
    label: "Proof Pack Refresh",
    statusHref: "/api/voice/proof-pack/refresh-status",
  },
  {
    description:
      "Read-back proof that the latest customer-owned export can be replayed from file or SQLite storage.",
    href: "/voice/observability-export/replay",
    label: "Observability Export Replay",
    statusHref: "/api/voice/observability-export/replay",
  },
  {
    description:
      "Self-hosted data-control proof for redaction, audit exports, retention dry-runs, and guarded deletion.",
    href: "/data-control",
    label: "Data Control",
    statusHref: "/data-control.json",
  },
  {
    description:
      "Code-owned specialist routing proof for the support-to-billing squad path.",
    href: "/agent-squad-contract",
    label: "Agent Squad Contract",
    statusHref: "/api/agent-squad-contract",
  },
  {
    description:
      "Seeded certification fixtures that prove workflows pass before live traffic.",
    href: "/evals/fixtures",
    label: "Fixture Evals",
    statusHref: "/evals/fixtures/status",
  },
  {
    description: "Provider failover, degradation, and simulator controls.",
    href: "/resilience",
    label: "Resilience",
  },
  {
    description:
      "Recovered fallback proof: raw provider errors remain inspectable while recovered sessions stay healthy.",
    href: "/provider-recovery",
    label: "Provider Recovery",
    statusHref: "/api/production-readiness",
  },
  {
    description:
      "Code-owned LLM provider fallback proof for the configured model router.",
    href: "/api/provider-routing-contract",
    label: "Provider Routing Contract",
    statusHref: "/api/provider-routing-contract",
  },
  {
    description:
      "Code-owned realtime STT fallback proof for the Deepgram to AssemblyAI route.",
    href: "/api/stt-provider-routing-contract",
    label: "STT Routing Contract",
    statusHref: "/api/stt-provider-routing-contract",
  },
  {
    description:
      "Code-owned TTS fallback proof for the OpenAI to emergency audio route.",
    href: "/api/tts-provider-routing-contract",
    label: "TTS Routing Contract",
    statusHref: "/api/tts-provider-routing-contract",
  },
  {
    description:
      "Code-owned browser disconnect, resumed transport, and replay-safe turn state proof.",
    href: "/voice/reconnect-contract",
    label: "Reconnect Contract",
    statusHref: "/api/voice/reconnect-contract",
  },
  {
    description:
      "Single pass/warn/fail report for quality, providers, routing evidence, handoffs, sessions, and carriers.",
    href: "/production-readiness",
    label: "Production Readiness",
    statusHref: "/api/production-readiness",
  },
  {
    description:
      "One phone-agent entrypoint for carrier setup, smoke checks, lifecycle stages, and readiness.",
    href: "/phone-agent",
    label: "Phone Agent",
    statusHref: "/api/voice/phone/setup",
  },
  {
    description:
      "Configured, selected, and healthy LLM/STT providers for this deployment.",
    href: "/provider-capabilities",
    label: "Provider Capabilities",
    statusHref: "/api/provider-capabilities",
  },
  {
    description:
      "Contract matrix for provider env, latency budgets, fallback, streaming, and capabilities.",
    href: "/provider-contracts",
    label: "Provider Contracts",
    statusHref: "/api/provider-contracts",
  },
  {
    description:
      "LLM/STT/TTS latency, p95, timeout, fallback, and unresolved-error SLO proof.",
    href: "/voice/provider-slos",
    label: "Provider SLOs",
    statusHref: "/api/voice/provider-slos",
  },
  {
    description:
      "Repeated proof cycles for provider SLOs, turn latency, live latency, ops recovery, and readiness.",
    href: "/voice/proof-trends",
    label: "Sustained Proof Trends",
    statusHref: "/api/voice/proof-trends",
  },
  {
    description:
      "Primitive-mounted assistant tool contracts for deterministic tool behavior.",
    href: "/tool-contracts",
    label: "Tool Contracts",
    statusHref: "/api/tool-contracts",
  },
  {
    description:
      "Per-turn responsiveness from transcript timing to committed assistant response.",
    href: "/turn-latency",
    label: "Turn Latency",
    statusHref: "/api/turn-latency",
  },
  {
    description:
      "Browser-measured speech-to-assistant response p50/p95 over recent live calls.",
    href: "/live-latency",
    label: "Live Latency",
    statusHref: "/api/live-latency",
  },
  {
    description:
      "Per-turn STT confidence, fallback, correction, and transcript diagnostics.",
    href: "/turn-quality",
    label: "Turn Quality",
    statusHref: "/api/turn-quality",
  },
  {
    description:
      "Business outcome contracts for sessions, reviews, tasks, handoffs, and integration events.",
    href: "/outcome-contracts",
    label: "Outcome Contracts",
    statusHref: "/api/outcome-contracts",
  },
  {
    description:
      "Normalize carrier events into transfer, voicemail, no-answer, and route-result primitives.",
    href: "/telephony-outcomes",
    label: "Telephony Outcomes",
    statusHref: "/api/telephony-outcomes",
  },
  {
    description:
      "Latest Twilio, Telnyx, and Plivo webhook decisions after outcome normalization.",
    href: "/telephony-webhook-decisions",
    label: "Webhook Decisions",
    statusHref: "/api/telephony-webhook-decisions",
  },
  {
    description:
      "Self-hosted outbound campaign queue depth, active attempts, stuck work, and failure reasons.",
    href: "/voice/campaigns/observability",
    label: "Campaign Observability",
    statusHref: "/api/voice/campaigns/observability",
  },
  {
    description:
      "Dry-run Twilio, Telnyx, and Plivo campaign dialing from queue to webhook outcome.",
    href: "/voice/campaigns/dialer-proof",
    label: "Campaign Dialer Proof",
    statusHref: "/api/voice/campaigns/dialer-proof",
  },
  {
    description:
      "Twilio, Telnyx, and Plivo setup, signing, stream URL, and contract readiness side-by-side.",
    href: "/carriers",
    label: "Carrier Matrix",
    statusHref: "/api/carriers",
  },
  {
    description: "Redacted trace exports for debugging and support.",
    href: "/diagnostics",
    label: "Diagnostics",
  },
  {
    description:
      "Per-call timelines with provider latency, fallback, timeout, handoff, and error context.",
    href: "/traces",
    label: "Trace Timelines",
    statusHref: "/api/voice-traces",
  },
  {
    description:
      "Interruption latency proof for barge-in, playback stop, and resumed capture.",
    href: "/barge-in",
    label: "Barge-In",
    statusHref: "/api/voice-barge-in",
  },
  {
    description: "Recent calls with replay links.",
    href: "/sessions",
    label: "Sessions",
  },
  {
    description: "Transfer and webhook delivery health.",
    href: "/handoffs",
    label: "Handoffs",
  },
  {
    description: "Follow-up tasks created from call outcomes.",
    href: "/tasks",
    label: "Tasks",
  },
  {
    description: "CRM/helpdesk sync and integration events.",
    href: "/integrations",
    label: "Integrations",
  },
];

const seedDemoRealtimeChannelProof = async () => {
  const session = createProofSession({
    assistantText:
      "Realtime channel proof is using raw PCM browser audio with OpenAI Realtime.",
    disposition: "completed",
    reason: "realtime-channel-proof",
    scenarioId: "realtime-channel-proof",
    sessionId: "proof-realtime-channel",
    turns: ["Prove the realtime channel is ready."],
  });
  const turn = session.turns[0];
  const committedAt = turn?.committedAt ?? Date.now();
  const turnId = turn?.id ?? "proof-realtime-channel:turn:0";

  await runtimeStorage.session.set(session.id, session);
  await appendProofTrace({
    at: committedAt - 240,
    metadata: { proof: "realtime-channel", realtime: true },
    payload: { type: "start" },
    scenarioId: "realtime-channel-proof",
    sessionId: session.id,
    type: "call.lifecycle",
  });
  await appendProofTrace({
    at: committedAt - 120,
    metadata: { proof: "realtime-channel", realtime: true },
    payload: {
      confidence: 0.98,
      isFinal: true,
      text: turn?.text ?? "Prove the realtime channel is ready.",
      vendor: "openai-realtime",
    },
    scenarioId: "realtime-channel-proof",
    sessionId: session.id,
    turnId,
    type: "turn.transcript",
  });
  await appendProofTrace({
    at: committedAt,
    metadata: { proof: "realtime-channel", realtime: true },
    payload: {
      fallbackUsed: false,
      reason: "vendor",
      source: "primary",
      text: turn?.text ?? "Prove the realtime channel is ready.",
      transcriptCount: 1,
    },
    scenarioId: "realtime-channel-proof",
    sessionId: session.id,
    turnId,
    type: "turn.committed",
  });
  for (const [stage, offset] of [
    ["turn_committed", 0],
    ["assistant_text_started", 160],
    ["tts_send_started", 190],
    ["tts_send_completed", 360],
    ["assistant_audio_received", 420],
  ] as const) {
    await appendProofTrace({
      at: committedAt + offset,
      metadata: { proof: "realtime-channel", realtime: true },
      payload: { stage },
      scenarioId: "realtime-channel-proof",
      sessionId: session.id,
      turnId,
      type: "turn_latency.stage",
    });
  }
  await appendProofTrace({
    at: committedAt + 180,
    metadata: { proof: "realtime-channel", realtime: true },
    payload: {
      realtimeConfigured: true,
      text: turn?.assistantText,
      ttsConfigured: false,
    },
    scenarioId: "realtime-channel-proof",
    sessionId: session.id,
    turnId,
    type: "turn.assistant",
  });
  await appendProofTrace({
    at: committedAt + 360,
    metadata: { proof: "realtime-channel", realtime: true },
    payload: {
      elapsedMs: 170,
      mode: "realtime",
      status: "sent",
    },
    scenarioId: "realtime-channel-proof",
    sessionId: session.id,
    turnId,
    type: "turn.assistant",
  });
  await appendProofTrace({
    at: committedAt + 620,
    metadata: { proof: "realtime-channel", realtime: true },
    payload: { status: "resumed" },
    scenarioId: "realtime-channel-proof",
    sessionId: session.id,
    turnId,
    type: "client.reconnect",
  });
  await appendProofTrace({
    at: committedAt + 500,
    metadata: { proof: "realtime-channel", realtime: true },
    payload: {
      at: committedAt + 500,
      id: "realtime-media-pipeline-interruption",
      latencyMs: 190,
      reason: "media-pipeline-proof",
      sessionId: session.id,
      status: "stopped",
      thresholdMs: 250,
    },
    scenarioId: "realtime-channel-proof",
    sessionId: session.id,
    turnId,
    type: "client.barge_in",
  });

  return { ok: true, sessionId: session.id, turnId };
};

const buildDemoRealtimeChannelReportOptions = async () => {
  const events = await runtimeStorage.traces.list({ limit: 500 });
  const runtimeSamples = buildVoiceRealtimeChannelRuntimeSamplesFromTrace(
    events.filter(
      (event) =>
        event.metadata?.realtime === true ||
        event.metadata?.proof === "realtime-channel" ||
        event.sessionId === "proof-realtime-channel",
    ),
    {
      format: realtimeChannelFormat,
      source: "persisted-trace-store",
    },
  );

  return {
    browserCapture: {
      audioContextSampleRateHz: 48_000,
      channelCount: 1 as const,
      processorBufferSize: 4096,
      sampleRateHz: 24_000,
    },
    inputFormat: realtimeChannelFormat,
    maxFirstAudioLatencyMs: 800,
    minAssistantAudioSamples: 1,
    minInputAudioSamples: 1,
    operationsRecordHref: "/voice-operations/demo-incident-bundle",
    outputFormat: realtimeChannelFormat,
    provider: "openai-realtime",
    readinessHref: "/production-readiness",
    runtimeSamples:
      runtimeSamples.length > 0
        ? runtimeSamples
        : [
            {
              format: realtimeChannelFormat,
              kind: "input-audio" as const,
              ok: true,
              source: "configured-fallback",
            },
            {
              format: realtimeChannelFormat,
              kind: "assistant-audio" as const,
              latencyMs: 420,
              ok: true,
              source: "configured-fallback",
            },
          ],
  };
};

const buildDemoRealtimeChannelReport = async () =>
  buildVoiceRealtimeChannelReport(
    await buildDemoRealtimeChannelReportOptions(),
  );

const buildDemoGeminiRealtimeChannelReport = async () =>
  buildVoiceRealtimeChannelReport({
    ...(await buildDemoRealtimeChannelReportOptions()),
    maxFirstAudioLatencyMs: 900,
    provider: "gemini-live",
  });

const buildDemoMediaPipelineReportOptions = async (
  input: { preferTraceEvidence?: boolean } = {},
) => {
  const events =
    input.preferTraceEvidence === false
      ? []
      : (await runtimeStorage.traces.list({ limit: 500 })).filter(
          (event) =>
            event.metadata?.realtime === true ||
            event.metadata?.proof === "realtime-channel" ||
            event.sessionId === "proof-realtime-channel",
        );
  const traceFrames = events
    .map((event): MediaFrame | undefined => {
      const traceEventId = `${event.type}:${String(event.at)}:${event.turnId ?? event.sessionId ?? "session"}`;
      const base = {
        at: event.at,
        format: realtimeChannelFormat,
        id: traceEventId,
        metadata: { traceType: event.type },
        sessionId: event.sessionId,
        traceEventId,
        turnId: event.turnId,
      } satisfies Partial<MediaFrame>;

      if (event.type === "turn.transcript") {
        return createMediaFrame({
          ...base,
          durationMs: 20,
          kind: "input-audio",
          metadata: { ...base.metadata, level: 0.52, speechProbability: 0.92 },
          source: "browser",
        } as MediaFrame);
      }

      if (
        event.type === "turn_latency.stage" &&
        event.payload &&
        typeof event.payload === "object" &&
        "stage" in event.payload &&
        event.payload.stage === "assistant_audio_received"
      ) {
        return createMediaFrame({
          ...base,
          durationMs: 20,
          kind: "assistant-audio",
          latencyMs: 420,
          metadata: { ...base.metadata, jitterMs: 12, level: 0.45 },
          source: "provider",
        } as MediaFrame);
      }

      if (event.type === "turn.committed") {
        return createMediaFrame({
          ...base,
          kind: "turn-commit",
          source: "voice-runtime",
        } as MediaFrame);
      }

      if (event.type === "client.reconnect") {
        return createMediaFrame({
          ...base,
          kind: "metadata",
          source: "voice-runtime",
        } as MediaFrame);
      }

      if (event.type === "client.barge_in") {
        return createMediaFrame({
          ...base,
          kind: "interruption",
          latencyMs:
            event.payload &&
            typeof event.payload === "object" &&
            "latencyMs" in event.payload &&
            typeof event.payload.latencyMs === "number"
              ? event.payload.latencyMs
              : undefined,
          source: "voice-runtime",
        } as MediaFrame);
      }

      return undefined;
    })
    .filter((frame): frame is MediaFrame => frame !== undefined);
  const hasInputAudio = traceFrames.some(
    (frame) => frame.kind === "input-audio",
  );
  const hasAssistantAudio = traceFrames.some(
    (frame) => frame.kind === "assistant-audio",
  );
  const frames =
    hasInputAudio && hasAssistantAudio
      ? traceFrames
      : [
          createMediaFrame({
            at: 1_000,
            durationMs: 20,
            format: realtimeChannelFormat,
            id: "demo-media-input",
            kind: "input-audio",
            metadata: {
              level: 0.52,
              proof: "media-pipeline-fallback",
              speechProbability: 0.92,
            },
            sessionId: "proof-realtime-channel",
            source: "browser",
            traceEventId: "demo-media-input",
            turnId: "demo-media-turn",
          }),
          createMediaFrame({
            at: 1_520,
            durationMs: 20,
            format: realtimeChannelFormat,
            id: "demo-media-assistant",
            kind: "assistant-audio",
            latencyMs: 420,
            metadata: {
              jitterMs: 12,
              level: 0.45,
              proof: "media-pipeline-fallback",
            },
            sessionId: "proof-realtime-channel",
            source: "provider",
            traceEventId: "demo-media-assistant",
            turnId: "demo-media-turn",
          }),
          createMediaFrame({
            at: 1_570,
            format: realtimeChannelFormat,
            id: "demo-media-interruption",
            kind: "interruption",
            latencyMs: 190,
            metadata: { proof: "media-pipeline-fallback" },
            sessionId: "proof-realtime-channel",
            source: "voice-runtime",
            traceEventId: "demo-media-interruption",
            turnId: "demo-media-turn",
          }),
          createMediaFrame({
            at: 1_600,
            format: realtimeChannelFormat,
            id: "demo-media-turn-commit",
            kind: "turn-commit",
            metadata: { proof: "media-pipeline-fallback" },
            sessionId: "proof-realtime-channel",
            source: "voice-runtime",
            traceEventId: "demo-media-turn-commit",
            turnId: "demo-media-turn",
          }),
        ];
  const transport = createMediaTransport({
    inputFormat: realtimeChannelFormat,
    maxBufferedFrames: Math.max(frames.length + 1, 1),
    name: "absolutejs-browser-realtime-transport",
    outputFormat: realtimeChannelFormat,
  });

  await transport.connect?.();
  for (const frame of frames) {
    if (frame.kind === "input-audio") {
      await transport.receive(frame);
    }
    if (frame.kind === "assistant-audio") {
      await transport.send(frame);
    }
  }
  const processorGraph = createMediaProcessorGraph({
    name: "absolutejs-realtime-media-graph",
    nodes: [
      {
        kind: "filter",
        name: "speech-and-assistant-audio",
        process: (frame) =>
          frame.kind === "input-audio" ||
          frame.kind === "assistant-audio" ||
          frame.kind === "interruption" ||
          frame.kind === "turn-commit",
      },
      {
        kind: "branch",
        name: "transcript-alignment-branch",
        process: (frame) =>
          frame.kind === "input-audio"
            ? [
                frame,
                createMediaFrame({
                  ...frame,
                  id: `${frame.id}:transcript-alignment`,
                  kind: "transcript",
                  metadata: {
                    ...frame.metadata,
                    graphGenerated: true,
                    processor: "transcript-alignment-branch",
                  },
                  source: "voice-runtime",
                }),
              ]
            : frame,
      },
      {
        kind: "processor",
        name: "provider-stage-marker",
        process: (frame) => ({
          ...frame,
          metadata: {
            ...frame.metadata,
            mediaProcessorGraph: "absolutejs-realtime-media-graph",
          },
        }),
      },
    ],
  });
  await processorGraph.processMany(frames);

  return {
    expectedInputFormat: realtimeChannelFormat,
    expectedOutputFormat: realtimeChannelFormat,
    frames,
    inputFormat: realtimeChannelFormat,
    maxBackpressureFrames: 0,
    maxFirstAudioLatencyMs: 800,
    maxJitterMs: 40,
    maxMediaBackpressureEvents: 0,
    maxMediaGapMs: 800,
    maxMediaJitterMs: 40,
    maxMediaTimestampDriftMs: 800,
    outputFormat: realtimeChannelFormat,
    requireInterruptionFrame: true,
    requireTraceEvidence: true,
    processorGraph: processorGraph.report(),
    surface: "direct-realtime-media-pipeline",
    transport: transport.report(),
    maxSilenceFrames: 1,
    minSpeechFrames: 1,
    minMediaSpeechRatio: 0.8,
    maxInterruptionLatencyMs: 250,
  };
};

const buildDemoVoiceSessionMediaSnapshot = async (
  sessionId: string,
  input: {
    events?: readonly StoredVoiceTraceEvent[];
    traceStore?: VoiceTraceEventStore;
  } = {},
) => {
  const events =
    input.events ??
    (await (input.traceStore ?? deliveryTraceStore).list({
      limit: 500,
      sessionId,
    }));
  const frames = events
    .map((event): MediaFrame | undefined => {
      const traceEventId = `${event.type}:${String(event.at)}:${event.turnId ?? event.sessionId}`;
      const base = {
        at: event.at,
        format: realtimeChannelFormat,
        id: traceEventId,
        metadata: { traceType: event.type },
        sessionId: event.sessionId,
        traceEventId,
        turnId: event.turnId,
      } satisfies Partial<MediaFrame>;

      if (event.type === "turn.transcript") {
        return createMediaFrame({
          ...base,
          durationMs: 20,
          kind: "input-audio",
          metadata: { ...base.metadata, speechProbability: 0.9 },
          source: "browser",
        } as MediaFrame);
      }

      if (event.type === "turn.assistant") {
        return createMediaFrame({
          ...base,
          durationMs: 20,
          kind: "assistant-audio",
          source: "provider",
        } as MediaFrame);
      }

      if (event.type === "turn.committed") {
        return createMediaFrame({
          ...base,
          kind: "turn-commit",
          source: "voice-runtime",
        } as MediaFrame);
      }

      return undefined;
    })
    .filter((frame): frame is MediaFrame => frame !== undefined);
  const graph = createMediaProcessorGraph({
    name: "absolutejs-session-debug-media-graph",
    nodes: [
      {
        kind: "filter",
        name: "session-audio-and-turn-events",
        process: (frame) =>
          frame.kind === "input-audio" ||
          frame.kind === "assistant-audio" ||
          frame.kind === "turn-commit",
      },
      {
        kind: "processor",
        name: "session-debug-marker",
        process: (frame) => ({
          ...frame,
          metadata: {
            ...frame.metadata,
            debugSnapshot: true,
            mediaProcessorGraph: "absolutejs-session-debug-media-graph",
          },
        }),
      },
    ],
  });

  if (frames.length > 0) {
    await graph.processMany(frames);
  }

  return graph.snapshot();
};

const buildDemoRealtimeProviderContractMatrixInput = async () =>
  createVoiceRealtimeProviderContractMatrixPreset({
    configured: {
      "gemini-live": Boolean(geminiRealtime),
      "openai-realtime": Boolean(openAIRealtime),
    },
    env: {
      ...process.env,
      GEMINI_API_KEY: geminiApiKey,
    },
    fallbackProviders: {
      "gemini-live": ["openai-realtime", "cascaded-stt-llm-tts"],
      "openai-realtime": ["cascaded-stt-llm-tts"],
    },
    implementationStatus: {
      "gemini-live": geminiRealtime ? "available" : "planned",
    },
    latencyBudgets: {
      "gemini-live": 900,
      "openai-realtime": 800,
    },
    readinessHref: "/production-readiness",
    realtimeChannels: {
      "gemini-live": geminiRealtime
        ? await buildDemoGeminiRealtimeChannelReport()
        : undefined,
      "openai-realtime": await buildDemoRealtimeChannelReport(),
    },
    selected: "openai-realtime",
    traceHref: "/traces?sessionId=proof-realtime-channel",
  });

const seedDemoOutcomeProof = async () => {
  for (const sessionId of [
    "proof-guided-completed",
    "proof-general-completed",
    "proof-transfer-billing",
    "proof-escalated",
    "proof-voicemail",
    "proof-no-answer",
  ]) {
    const traces = await runtimeStorage.traces.list({ sessionId });
    await Promise.all(
      traces.map((trace) => runtimeStorage.traces.remove(trace.id)),
    );
  }

  const proofSessions: Array<{
    assistantText: string;
    disposition: ProofCallDisposition;
    evalScenarioId: string;
    mode: "general" | "guided";
    reason?: string;
    scenarioId: string;
    sessionId: string;
    target?: string;
    turns: readonly string[];
  }> = [
    {
      assistantText: "Thanks Alex. Your voice test is saved.",
      disposition: "completed",
      evalScenarioId: "proof-guided",
      mode: "guided",
      scenarioId: "guided",
      sessionId: "proof-guided-completed",
      turns: [
        "My name is Alex and I need help with the AbsoluteJS voice integration.",
        "The integration issue is around provider routing and meeting recorder follow up.",
        "Please follow up with the integration checklist and next steps.",
      ],
    },
    {
      assistantText: "Received.",
      disposition: "completed",
      evalScenarioId: "proof-general",
      mode: "general",
      scenarioId: "general",
      sessionId: "proof-general-completed",
      turns: [
        "General recording for a customer call with clear follow up notes.",
      ],
    },
    {
      assistantText: "Transferring this call to billing.",
      disposition: "transferred",
      evalScenarioId: "proof-transfer",
      mode: "guided",
      reason: "caller-requested-transfer",
      scenarioId: "transfer",
      sessionId: "proof-transfer-billing",
      target: "billing",
      turns: ["Please transfer this billing issue to billing support."],
    },
    {
      assistantText: "Escalating this call for human follow-up.",
      disposition: "escalated",
      evalScenarioId: "proof-outcome-escalated",
      mode: "guided",
      reason: "caller-requested-escalation",
      scenarioId: "outcome-escalated",
      sessionId: "proof-escalated",
      turns: ["I need a human supervisor to review this support issue."],
    },
    {
      assistantText: "Marking this call as voicemail.",
      disposition: "voicemail",
      evalScenarioId: "proof-outcome-voicemail",
      mode: "general",
      scenarioId: "outcome-voicemail",
      sessionId: "proof-voicemail",
      turns: ["Please leave this as a voicemail for callback."],
    },
    {
      assistantText: "Marking this call as no answer.",
      disposition: "no-answer",
      evalScenarioId: "proof-outcome-no-answer",
      mode: "general",
      scenarioId: "outcome-no-answer",
      sessionId: "proof-no-answer",
      turns: ["No answer from the caller, retry this later."],
    },
  ];

  for (const proof of proofSessions) {
    const session = createProofSession(proof);
    const mode = proof.mode;
    const result = buildSavedIntake(session, mode);
    session.turns = session.turns.map((turn, index) =>
      index === session.turns.length - 1 ? { ...turn, result } : turn,
    );

    await runtimeStorage.session.set(session.id, session);
    await recordVoiceRuntimeOps({
      api: {} as never,
      config: {
        buildReview: ({ result: runtimeResult, session: reviewSession }) =>
          buildSavedVoiceReview({
            phraseHints: VOICE_DEMO_PHRASE_HINTS,
            result:
              (runtimeResult as SavedIntake | undefined) ??
              buildSavedIntake(reviewSession, mode),
            session: reviewSession,
          }),
        events: runtimeStorage.events,
        onEvent: async ({ event }) => {
          await deliverIntegrationEvent(event as SavedVoiceIntegrationEvent);
        },
        reviews: runtimeStorage.reviews as unknown as VoiceCallReviewStore,
        tasks: runtimeStorage.tasks as unknown as VoiceOpsTaskStore,
      },
      context: {},
      disposition: proof.disposition,
      reason: proof.reason,
      session,
      target: proof.target,
    });

    await appendProofTrace({
      at: session.call?.startedAt ?? Date.now(),
      payload: {
        type: "start",
      },
      scenarioId: proof.evalScenarioId,
      sessionId: session.id,
      type: "call.lifecycle",
    });

    for (const turn of session.turns) {
      const finalTranscript = turn.transcripts.find(
        (transcript) => transcript.isFinal,
      );
      if (finalTranscript) {
        await appendProofTrace({
          at: (turn.committedAt ?? Date.now()) - 120,
          payload: {
            confidence: finalTranscript.confidence,
            isFinal: true,
            text: finalTranscript.text,
            vendor: finalTranscript.vendor,
          },
          scenarioId: proof.evalScenarioId,
          sessionId: session.id,
          turnId: turn.id,
          type: "turn.transcript",
        });
      }
      await appendProofTrace({
        at: turn.committedAt ?? Date.now(),
        payload: {
          text: turn.text,
        },
        scenarioId: proof.evalScenarioId,
        sessionId: session.id,
        turnId: turn.id,
        type: "turn.committed",
      });
      if (turn.assistantText) {
        await appendProofTrace({
          at: (turn.committedAt ?? Date.now()) + 80,
          payload: {
            text: turn.assistantText,
          },
          scenarioId: proof.evalScenarioId,
          sessionId: session.id,
          turnId: turn.id,
          type: "turn.assistant",
        });
      }
    }

    await appendProofTrace({
      at: session.call?.endedAt ?? Date.now(),
      payload: {
        disposition: proof.disposition,
        reason: proof.reason,
        target: proof.target,
        type:
          proof.disposition === "transferred"
            ? "transfer"
            : proof.disposition === "escalated"
              ? "escalation"
              : proof.disposition === "voicemail"
                ? "voicemail"
                : proof.disposition === "no-answer"
                  ? "no-answer"
                  : "end",
      },
      scenarioId: proof.evalScenarioId,
      sessionId: session.id,
      type: "call.lifecycle",
    });

    const contractId =
      proof.scenarioId === "transfer"
        ? "transfer-handoff-delivered"
        : proof.scenarioId === "general"
          ? "general-recording-completes"
          : proof.scenarioId === "guided"
            ? "guided-demo-completes"
            : undefined;
    if (contractId) {
      await appendProofTrace({
        at: (session.call?.endedAt ?? Date.now()) + 20,
        payload: {
          contractId,
          status: "pass",
        },
        scenarioId: proof.evalScenarioId,
        sessionId: session.id,
        type: "workflow.contract",
      });
    }
  }

  const transferSession = createProofSession({
    assistantText: "Transferring this call to billing.",
    disposition: "transferred",
    reason: "caller-requested-transfer",
    scenarioId: "proof-transfer",
    sessionId: "proof-transfer-billing",
    target: "billing",
    turns: ["Please transfer this billing issue to billing support."],
  });
  await handoffDeliveryStore.set("proof-transfer-billing:handoff", {
    action: "transfer",
    context: {},
    createdAt: transferSession.call?.endedAt ?? Date.now(),
    deliveredAt: transferSession.call?.endedAt ?? Date.now(),
    deliveryAttempts: 1,
    deliveryStatus: "delivered",
    id: "proof-transfer-billing:handoff",
    reason: "caller-requested-transfer",
    session: transferSession,
    sessionId: transferSession.id,
    target: "billing",
    updatedAt: transferSession.call?.endedAt ?? Date.now(),
  });
  await appendProofTrace({
    at: transferSession.call?.endedAt ?? Date.now(),
    payload: {
      action: "transfer",
      deliveries: {
        "proof-transfer-adapter": {
          adapterId: "proof-transfer-adapter",
          deliveredAt: transferSession.call?.endedAt ?? Date.now(),
          deliveredTo: "billing",
          status: "delivered",
        },
      },
      status: "delivered",
      target: "billing",
    },
    scenarioId: "transfer",
    sessionId: transferSession.id,
    type: "call.handoff",
  });

  return {
    ok: true,
    sessions: proofSessions.length,
  };
};

const buildDemoIncidentTimelineMediaPipelineReport = async () =>
  buildVoiceMediaPipelineReport(
    await buildDemoMediaPipelineReportOptions({ preferTraceEvidence: false }),
  );

const buildDemoIncidentTimelineOperationsRecord = async () =>
  buildVoiceOperationsRecord({
    audit: runtimeStorage.audit,
    integrationEvents: runtimeStorage.events,
    mediaPipeline: await buildDemoIncidentTimelineMediaPipelineReport(),
    redact: voiceSupportArtifactRedaction,
    reviews: runtimeStorage.reviews as unknown as VoiceCallReviewStore,
    sessionId: demoIncidentSessionId,
    store: deliveryTraceStore,
    tasks: runtimeStorage.tasks as unknown as VoiceOpsTaskStore,
  });

const buildDemoIncidentTimelineFailureReplay = async () => {
  const record = await buildDemoIncidentTimelineOperationsRecord();

  return buildVoiceFailureReplay(record, {
    operationsRecordHref: ({ sessionId }) =>
      `/voice-operations/${encodeURIComponent(sessionId)}`,
  });
};

const formatLiveOpsActionLabel = (action: VoiceLiveOpsAction) => {
  switch (action) {
    case "assign":
      return "Assign live session";
    case "create-task":
      return "Create ops task";
    case "escalate":
      return "Escalate live session";
    case "force-handoff":
      return "Force handoff";
    case "inject-instruction":
      return "Inject assistant instruction";
    case "operator-takeover":
      return "Operator takeover";
    case "pause-assistant":
      return "Pause assistant";
    case "resume-assistant":
      return "Resume assistant";
    case "tag":
      return "Tag live session";
  }
};

const handleLiveOpsAction = async (body: unknown) => {
  const input =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const action = input.action;
  const sessionId = toStringValue(input.sessionId);

  if (!sessionId || !isLiveOpsAction(action)) {
    return Response.json(
      { error: "A valid sessionId and action are required.", ok: false },
      { status: 400 },
    );
  }

  const assignee = toStringValue(input.assignee) ?? "demo-operator";
  const tag = toStringValue(input.tag) ?? "needs-review";
  const detail =
    toStringValue(input.detail) ?? formatLiveOpsActionLabel(action);
  const at = Date.now();
  const taskId = `live-ops:${sessionId}:${action}:${at}`;
  let task: SavedVoiceOpsTask | undefined;
  const previousControl = liveOpsSessionControls.get(sessionId);
  const control = buildVoiceLiveOpsControlState({
    action,
    assignee,
    at,
    detail,
    previous: previousControl,
    sessionId,
    tag,
  });
  liveOpsSessionControls.set(sessionId, control);

  await runtimeStorage.audit.append(
    createVoiceAuditEvent({
      action: `live_ops.${action}`,
      actor: {
        id: assignee,
        kind: "operator",
        name: assignee,
      },
      at,
      metadata: {
        source: "browser-live-ops",
        tag,
      },
      outcome: "success",
      payload: {
        action,
        assignee,
        control,
        detail,
        tag,
      },
      resource: {
        id: sessionId,
        type: "voice.session",
      },
      sessionId,
      type: "operator.action",
    }),
  );
  await deliveryTraceStore.append({
    at,
    metadata: {
      source: "browser-live-ops",
      tag,
    },
    payload: {
      action,
      assignee,
      control,
      detail,
      tag,
      status: "success",
    },
    sessionId,
    type: "operator.action",
  });

  if (
    action === "create-task" ||
    action === "escalate" ||
    action === "force-handoff" ||
    action === "operator-takeover"
  ) {
    task = {
      assignee,
      createdAt: at,
      description: detail,
      history: [
        {
          actor: assignee,
          at,
          detail,
          type: "created",
        },
      ],
      id: taskId,
      intakeId: sessionId,
      kind:
        action === "escalate" ||
        action === "force-handoff" ||
        action === "operator-takeover"
          ? "escalation"
          : "support-triage",
      outcome:
        action === "escalate" ||
        action === "force-handoff" ||
        action === "operator-takeover"
          ? "escalated"
          : "completed",
      recommendedAction:
        action === "force-handoff"
          ? "Force route this live session to the requested human or specialist queue."
          : action === "operator-takeover" || action === "escalate"
            ? "Human operator should take over this live voice session."
            : "Review the active call and follow up with the caller.",
      reviewId: sessionId,
      status:
        action === "escalate" ||
        action === "force-handoff" ||
        action === "operator-takeover"
          ? "in-progress"
          : "open",
      target: tag,
      title:
        action === "force-handoff"
          ? `Force handoff live session ${sessionId}`
          : action === "operator-takeover"
            ? `Operator takeover live session ${sessionId}`
            : action === "escalate"
              ? `Escalate live session ${sessionId}`
              : `Follow up live session ${sessionId}`,
      updatedAt: at,
    };
    await runtimeStorage.tasks.set(task.id, task);
    await emitTaskUpdatedEvent(task);
  }

  return Response.json({
    action,
    control,
    incidentBundleHref: `/voice-incidents/${encodeURIComponent(sessionId)}/markdown`,
    ok: true,
    operationsRecordHref: `/voice-operations/${encodeURIComponent(sessionId)}`,
    sessionId,
    task,
    taskHref: task ? `/tasks` : undefined,
  });
};

const liveOpsControlRoutes = new Elysia()
  .post("/api/voice/live-ops/action", ({ body }) => handleLiveOpsAction(body))
  .get("/api/voice/live-ops/control/:sessionId", ({ params }) =>
    Response.json({
      control: liveOpsSessionControls.get(params.sessionId) ?? null,
      ok: true,
      sessionId: params.sessionId,
    }),
  ) as unknown as Elysia;

export {
  buildDemoGeminiRealtimeChannelReport,
  buildDemoIncidentTimelineFailureReplay,
  buildDemoIncidentTimelineMediaPipelineReport,
  buildDemoIncidentTimelineOperationsRecord,
  buildDemoMediaPipelineReportOptions,
  buildDemoRealtimeChannelReport,
  buildDemoRealtimeChannelReportOptions,
  buildDemoRealtimeProviderContractMatrixInput,
  buildDemoVoiceSessionMediaSnapshot,
  formatLiveOpsActionLabel,
  handleLiveOpsAction,
  liveOpsControlRoutes,
  opsSurfaceLinks,
  seedDemoOutcomeProof,
  seedDemoRealtimeChannelProof,
};
