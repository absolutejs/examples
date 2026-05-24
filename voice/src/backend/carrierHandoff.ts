import type { SavedIntake } from "../types/domain";
import {
  listVoiceIntegrationEvents,
  type SavedVoiceIntegrationEvent,
} from "./integrationsPage";
import {
  listVoiceOpsTasks,
  type SavedVoiceOpsTask,
  type VoiceOpsTaskFilterInput,
} from "./opsPage";
import { listVoiceReviews, type SavedVoiceReviewArtifact } from "./reviewPage";
import { buildMediaWebRTCStatsReport } from "@absolutejs/media";
import {
  createVoiceHandoffDeliveryWorker,
  createVoiceOpsWebhookSink,
  createVoiceWebhookHandoffAdapter,
  deliverVoiceIntegrationEventToSinks,
  type StoredVoiceTraceEvent,
  type VoiceOpsWebhookEnvelope,
  type VoiceSessionRecord,
  type VoiceTelephonyCarrierMatrixInput,
  type VoiceTelephonyProvider,
  type VoiceTelephonySetupStatus,
  type VoiceTelephonySmokeReport,
  type VoiceTraceEvent,
  voice,
} from "@absolutejs/voice";
import { createDemoLeaseCoordinator } from "./helpers";
import {
  deliveryTraceStore,
  handoffWebhookUrl,
  plivoAuthToken,
  publicBaseUrl,
  requireProductionCarrierReadiness,
  telephonyWebhookSigningSecret,
  telnyxPublicKey,
  webhookSigningSecret,
  webhookUrl,
} from "./providers";
import {
  handoffDeliveryStore,
  rawDeliveryTraceStore,
  runtimeStorage,
} from "./stores";

const resolveRequestOrigin = (request: Request) => {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host") ?? url.host;
  const protocol = forwardedProto ?? url.protocol.replace(":", "");

  return `${protocol}://${host}`;
};

const joinUrlPath = (origin: string, path: string) =>
  `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const resolveCarrierOrigin = (request: Request) =>
  publicBaseUrl?.replace(/\/$/, "") ?? resolveRequestOrigin(request);

const resolveCarrierStreamUrl = (request: Request, path: string) => {
  if (!requireProductionCarrierReadiness) {
    return joinUrlPath(`wss://${new URL(request.url).host}`, path);
  }

  const origin = resolveCarrierOrigin(request);
  const wsOrigin = origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:");

  return joinUrlPath(wsOrigin, path);
};

const resolvePhoneAgentStreamUrl = ({
  request,
  streamPath,
}: {
  query: Record<string, unknown>;
  request: Request;
  streamPath: string;
}) => {
  if (requireProductionCarrierReadiness) {
    return resolveCarrierStreamUrl(request, streamPath);
  }

  return joinUrlPath(`wss://${new URL(request.url).host}`, streamPath);
};

const localCarrierWebhookVerification = requireProductionCarrierReadiness
  ? undefined
  : () => ({ ok: true }) as const;

const productionOnlyEnv = (env: Record<string, string | undefined>) =>
  requireProductionCarrierReadiness ? env : {};

const resolveTelephonyWebhookVerificationUrl =
  (path: string) =>
  ({ request }: { query: Record<string, unknown>; request: Request }) =>
    publicBaseUrl
      ? joinUrlPath(publicBaseUrl, path)
      : joinUrlPath(new URL(request.url).origin, path);

const createCarrierSmoke = <TProvider extends VoiceTelephonyProvider>(
  setup: VoiceTelephonySetupStatus<TProvider>,
): VoiceTelephonySmokeReport<TProvider> => {
  const streamIsProductionSecure = setup.urls.stream.startsWith("wss://");
  const signingIsConfigured =
    setup.signing.configured || !requireProductionCarrierReadiness;
  const checks: VoiceTelephonySmokeReport<TProvider>["checks"] = [
    {
      message: setup.urls.stream
        ? "Carrier stream URL is configured."
        : "Carrier stream URL is missing.",
      name: "stream-url",
      status: setup.urls.stream ? "pass" : "fail",
    },
    {
      message: streamIsProductionSecure
        ? "Carrier stream URL uses wss://."
        : requireProductionCarrierReadiness
          ? "Carrier stream URL should use wss:// for production."
          : "Local carrier proof accepts ws://; use production mode to require wss://.",
      name: "wss-stream",
      status:
        streamIsProductionSecure || !requireProductionCarrierReadiness
          ? "pass"
          : "fail",
    },
    {
      message: setup.urls.webhook
        ? "Carrier webhook URL is configured."
        : "Carrier webhook URL is missing.",
      name: "webhook-url",
      status: setup.urls.webhook ? "pass" : "fail",
    },
    {
      message: signingIsConfigured
        ? `Webhook signing is configured with ${setup.signing.mode}.`
        : "Webhook signing is not configured.",
      name: "signed-webhook",
      status: signingIsConfigured ? "pass" : "fail",
    },
  ];

  for (const missing of requireProductionCarrierReadiness
    ? setup.missing
    : []) {
    checks.push({
      message: `${missing} is missing.`,
      name: "missing-env",
      status: "fail",
    });
  }

  for (const warning of setup.warnings) {
    checks.push({
      message: warning,
      name: "setup-warning",
      status: "warn",
    });
  }

  return {
    checks,
    generatedAt: Date.now(),
    pass: checks.every((check) => check.status !== "fail"),
    provider: setup.provider,
    setup,
    twiml: {
      status: setup.ready ? 200 : 428,
      streamUrl: setup.urls.stream,
    },
    webhook: {
      status: setup.signing.configured ? 200 : 428,
    },
  };
};

const createCarrierSetup = <TProvider extends VoiceTelephonyProvider>(input: {
  answerPath?: string;
  missing: string[];
  provider: TProvider;
  request: Request;
  signingConfigured: boolean;
  signingMode: VoiceTelephonySetupStatus<TProvider>["signing"]["mode"];
  streamPath: string;
  webhookPath: string;
}): VoiceTelephonySetupStatus<TProvider> => {
  const origin = resolveCarrierOrigin(input.request);
  const stream = resolveCarrierStreamUrl(input.request, input.streamPath);
  const webhook = joinUrlPath(origin, input.webhookPath);
  const streamIsProductionSecure = stream.startsWith("wss://");
  const signingConfigured =
    input.signingConfigured || !requireProductionCarrierReadiness;
  const warnings = [
    ...(streamIsProductionSecure || !requireProductionCarrierReadiness
      ? []
      : ["Carrier streams should use wss:// in production."]),
    ...(signingConfigured
      ? []
      : ["Webhook signature verification is not configured."]),
  ];
  const missing = requireProductionCarrierReadiness ? input.missing : [];

  return {
    generatedAt: Date.now(),
    missing,
    provider: input.provider,
    ready: missing.length === 0 && signingConfigured && warnings.length === 0,
    signing: {
      configured: signingConfigured,
      mode: input.signingConfigured
        ? input.signingMode
        : requireProductionCarrierReadiness
          ? "none"
          : "custom",
      verificationUrl: webhook,
    },
    urls: {
      stream,
      twiml: input.answerPath
        ? joinUrlPath(origin, input.answerPath)
        : undefined,
      webhook,
    },
    warnings,
  };
};

const loadCarrierMatrixInputs = ({
  request,
}: {
  query: Record<string, unknown>;
  request: Request;
}): VoiceTelephonyCarrierMatrixInput[] => {
  const twilio = createCarrierSetup({
    answerPath: "/api/twilio/voice",
    missing: [
      publicBaseUrl ? undefined : "VOICE_DEMO_PUBLIC_BASE_URL",
      telephonyWebhookSigningSecret
        ? undefined
        : "VOICE_DEMO_TELEPHONY_WEBHOOK_SECRET",
    ].filter(Boolean) as string[],
    provider: "twilio",
    request,
    signingConfigured: Boolean(telephonyWebhookSigningSecret),
    signingMode: "twilio-signature",
    streamPath: "/api/twilio/stream",
    webhookPath: "/api/telephony-webhook",
  });
  const telnyx = createCarrierSetup({
    answerPath: "/api/telnyx/voice",
    missing: [
      publicBaseUrl ? undefined : "VOICE_DEMO_PUBLIC_BASE_URL",
      telnyxPublicKey ? undefined : "TELNYX_PUBLIC_KEY",
    ].filter(Boolean) as string[],
    provider: "telnyx",
    request,
    signingConfigured: Boolean(telnyxPublicKey),
    signingMode: "provider-signature",
    streamPath: "/api/telnyx/stream",
    webhookPath: "/api/telnyx/webhook",
  });
  const plivo = createCarrierSetup({
    answerPath: "/api/plivo/voice",
    missing: [
      publicBaseUrl ? undefined : "VOICE_DEMO_PUBLIC_BASE_URL",
      plivoAuthToken ? undefined : "PLIVO_AUTH_TOKEN",
    ].filter(Boolean) as string[],
    provider: "plivo",
    request,
    signingConfigured: Boolean(plivoAuthToken),
    signingMode: "provider-signature",
    streamPath: "/api/plivo/stream",
    webhookPath: "/api/plivo/webhook",
  });

  return [twilio, telnyx, plivo].map((setup) => ({
    setup,
    smoke: createCarrierSmoke(setup),
  }));
};

const normalizeTaskFilters = (
  query: Record<string, unknown>,
): VoiceOpsTaskFilterInput => ({
  kind:
    query.kind === "callback" ||
    query.kind === "escalation" ||
    query.kind === "appointment-booking" ||
    query.kind === "lead-qualification" ||
    query.kind === "support-triage" ||
    query.kind === "transfer-check" ||
    query.kind === "retry-review"
      ? query.kind
      : "all",
  outcome:
    query.outcome === "completed" ||
    query.outcome === "transferred" ||
    query.outcome === "escalated" ||
    query.outcome === "voicemail" ||
    query.outcome === "no-answer" ||
    query.outcome === "failed" ||
    query.outcome === "closed"
      ? query.outcome
      : "all",
  status:
    query.status === "open" ||
    query.status === "in-progress" ||
    query.status === "done"
      ? query.status
      : "all",
});

const listReviews = async (): Promise<SavedVoiceReviewArtifact[]> =>
  listVoiceReviews(await runtimeStorage.reviews.list());

const receivedWebhookEnvelopes: VoiceOpsWebhookEnvelope[] = [];

const handoffAdapters = handoffWebhookUrl
  ? [
      createVoiceWebhookHandoffAdapter<
        unknown,
        VoiceSessionRecord,
        SavedIntake
      >({
        actions: ["transfer", "escalate", "voicemail", "no-answer"],
        id: "voice-demo-handoff-webhook",
        signingSecret: webhookSigningSecret,
        url: handoffWebhookUrl,
      }),
    ]
  : [];

const retryVoiceHandoffDeliveries = async () => {
  if (handoffAdapters.length === 0) {
    return {
      error: "VOICE_DEMO_HANDOFF_WEBHOOK_URL is not configured.",
    };
  }

  const worker = createVoiceHandoffDeliveryWorker({
    adapters: handoffAdapters,
    api: {} as never,
    deliveries: handoffDeliveryStore,
    leases: createDemoLeaseCoordinator(),
    maxFailures: 3,
    workerId: "voice-demo-handoff-retry",
  });

  return worker.drain();
};

const webhookSink = webhookUrl
  ? createVoiceOpsWebhookSink({
      baseUrl: publicBaseUrl,
      id: "voice-demo-ops-webhook",
      signingSecret: webhookSigningSecret,
      url: webhookUrl,
    })
  : undefined;

const deliverIntegrationEvent = async (
  event: SavedVoiceIntegrationEvent,
): Promise<SavedVoiceIntegrationEvent> => {
  const storedEvent: SavedVoiceIntegrationEvent = webhookSink
    ? await deliverVoiceIntegrationEventToSinks({
        event,
        sinks: [webhookSink],
      })
    : { ...event };

  await runtimeStorage.events.set(storedEvent.id, storedEvent);

  return storedEvent;
};

const listIntegrationEvents = async (): Promise<SavedVoiceIntegrationEvent[]> =>
  listVoiceIntegrationEvents(await runtimeStorage.events.list());

const listTasks = async (): Promise<SavedVoiceOpsTask[]> =>
  listVoiceOpsTasks(await runtimeStorage.tasks.list());

const seedTurnLatencyProof = async () => {
  const sessionId = `latency-proof-${crypto.randomUUID()}`;
  const turnId = `turn-${crypto.randomUUID()}`;
  const startedAt = Date.now() - 820;
  const timestamps = {
    assistantAudioReceived: startedAt + 690,
    assistantTextStarted: startedAt + 430,
    committed: startedAt + 360,
    finalTranscript: startedAt + 220,
    speechDetected: startedAt,
    ttsSendCompleted: startedAt + 535,
    ttsSendStarted: startedAt + 480,
  };
  const transcript = {
    confidence: 0.96,
    endedAtMs: timestamps.finalTranscript,
    id: `transcript-${crypto.randomUUID()}`,
    isFinal: true,
    startedAtMs: timestamps.speechDetected,
    text: "Show me the latency proof.",
    vendor: "absolutejs-proof",
  };
  const session: VoiceSessionRecord = {
    committedTurnIds: [turnId],
    createdAt: startedAt - 120,
    currentTurn: {
      finalText: "",
      partialText: "",
      transcripts: [],
    },
    id: sessionId,
    lastActivityAt: timestamps.assistantAudioReceived,
    lastCommittedTurn: {
      committedAt: timestamps.committed,
      signature: "show me the latency proof.",
      text: "Show me the latency proof.",
      transcriptIds: [transcript.id],
    },
    reconnect: {
      attempts: 0,
    },
    status: "completed",
    transcripts: [transcript],
    turns: [
      {
        assistantText: "Latency proof captured.",
        committedAt: timestamps.committed,
        id: turnId,
        text: "Show me the latency proof.",
        transcripts: [{ ...transcript, id: `turn-${transcript.id}` }],
      },
    ],
  };
  await runtimeStorage.session.set(sessionId, session);
  const stageEntries = [
    ["speech_detected", timestamps.speechDetected],
    ["final_transcript", timestamps.finalTranscript],
    ["turn_committed", timestamps.committed],
    ["assistant_text_started", timestamps.assistantTextStarted],
    ["tts_send_started", timestamps.ttsSendStarted],
    ["tts_send_completed", timestamps.ttsSendCompleted],
    ["assistant_audio_received", timestamps.assistantAudioReceived],
  ] as const;
  for (const [stage, at] of stageEntries) {
    await deliveryTraceStore.append({
      at,
      metadata: { proof: "turn-latency" },
      payload: { stage },
      sessionId,
      turnId,
      type: "turn_latency.stage",
    });
  }

  return { ok: true, sessionId, turnId };
};

const getDemoReconnectContractSnapshots = () => {
  const startedAt = Date.now() - 1_200;
  const firstTurnId = "reconnect-proof:turn:0";
  const secondTurnId = "reconnect-proof:turn:1";

  return [
    {
      at: startedAt,
      reconnect: {
        attempts: 0,
        maxAttempts: 10,
        status: "idle" as const,
      },
      turnIds: [firstTurnId],
    },
    {
      at: startedAt + 240,
      reconnect: {
        attempts: 1,
        lastDisconnectAt: startedAt + 240,
        maxAttempts: 10,
        nextAttemptAt: startedAt + 740,
        status: "reconnecting" as const,
      },
      turnIds: [firstTurnId],
    },
    {
      at: startedAt + 780,
      reconnect: {
        attempts: 1,
        lastResumedAt: startedAt + 780,
        maxAttempts: 10,
        status: "resumed" as const,
      },
      turnIds: [firstTurnId, secondTurnId],
    },
  ];
};

const appendProofTrace = async (event: VoiceTraceEvent) => {
  await deliveryTraceStore.append(event);
};

const resolveDemoSnapshotSessionId = async (requestedSessionId: string) => {
  if (requestedSessionId && requestedSessionId !== "latest") {
    return requestedSessionId;
  }

  const events = await deliveryTraceStore.list({ limit: 500 });
  const latest = events
    .filter(
      (event) => event.sessionId && event.sessionId !== "live-session-now",
    )
    .sort((left, right) => right.at - left.at)[0];

  return latest?.sessionId ?? "latest";
};

const resolveHealthyDemoSessionId = async (
  input: {
    events?: readonly StoredVoiceTraceEvent[];
  } = {},
) => {
  const events = input.events
    ? [...input.events]
    : await rawDeliveryTraceStore.list({ limit: 1_000 });
  const latest = events
    .filter(
      (event) =>
        event.sessionId &&
        event.sessionId !== "live-session-now" &&
        !event.sessionId.startsWith("provider-slo-proof-") &&
        !event.sessionId.startsWith("provider-decision-proof-") &&
        !event.sessionId.startsWith("production-readiness-live-latency-"),
    )
    .sort((left, right) => right.at - left.at)[0];

  return latest?.sessionId ?? resolveDemoSnapshotSessionId("latest");
};

const buildDemoBrowserMediaReport = () =>
  buildMediaWebRTCStatsReport({
    maxJitterMs: 30,
    maxPacketLossRatio: 0.02,
    maxRoundTripTimeMs: 250,
    requireConnectedCandidatePair: true,
    requireLiveAudioTrack: true,
    stats: [
      {
        bytesReceived: 240_000,
        id: "demo-browser-inbound-audio",
        jitter: 0.008,
        kind: "audio",
        packetsLost: 1,
        packetsReceived: 999,
        type: "inbound-rtp",
      },
      {
        bytesSent: 210_000,
        id: "demo-browser-outbound-audio",
        kind: "audio",
        packetsSent: 1_000,
        type: "outbound-rtp",
      },
      {
        currentRoundTripTime: 0.08,
        id: "demo-browser-candidate-pair",
        nominated: true,
        selected: true,
        state: "succeeded",
        type: "candidate-pair",
      },
      {
        audioLevel: 0.42,
        id: "demo-browser-audio-track",
        kind: "audio",
        readyState: "live",
        type: "media-source",
      },
    ],
  });

export {
  appendProofTrace,
  buildDemoBrowserMediaReport,
  deliverIntegrationEvent,
  getDemoReconnectContractSnapshots,
  handoffAdapters,
  listIntegrationEvents,
  listReviews,
  listTasks,
  loadCarrierMatrixInputs,
  localCarrierWebhookVerification,
  normalizeTaskFilters,
  productionOnlyEnv,
  receivedWebhookEnvelopes,
  resolveCarrierOrigin,
  resolveDemoSnapshotSessionId,
  resolveHealthyDemoSessionId,
  resolvePhoneAgentStreamUrl,
  resolveTelephonyWebhookVerificationUrl,
  retryVoiceHandoffDeliveries,
  seedTurnLatencyProof,
};
