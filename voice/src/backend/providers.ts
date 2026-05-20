import {
  VOICE_ASSISTANT_CONFIG,
  isVoiceModelProvider,
  isVoiceRoutingMode,
  type SavedIntake,
  type VoiceModelProvider,
  type VoiceRoutingMode,
} from "../shared/demo";
import { decideIntakeTurn } from "./voiceFlow";
import { getEnv } from "@absolutejs/absolute";
import {
  appendVoiceIOProviderRouterTraceEvent,
  appendVoiceProviderRouterTraceEvent,
  buildVoiceProviderContractMatrix,
  buildVoiceProviderOrchestrationReport,
  buildVoiceProviderRouterTraceEvent,
  createAnthropicVoiceAssistantModel,
  createGeminiVoiceAssistantModel,
  createOpenAIVoiceAssistantModel,
  createOpenAIVoiceTTS,
  createVoiceGuardrailRuntime,
  createVoiceProfileTraceTagger,
  createVoiceProviderContractMatrixPreset,
  createVoiceProviderOrchestrationProfile,
  createVoiceRealCallProfileTraceCollector,
  createVoiceTelephonyWebhookRoutes,
  createVoiceTelephonyWebhookSecurityPreset,
  runVoiceProviderRoutingContract,
  signVoicePlivoWebhook,
  signVoiceTwilioWebhook,
  type STTAdapter,
  type StoredVoiceTraceEvent,
  type TTSAdapter,
  type TTSAdapterSession,
  type VoiceAgentModel,
  type VoiceIOProviderRouterEvent,
  type VoiceProviderOrchestrationReport,
  type VoiceProviderRouterEvent,
  type VoiceSessionRecord,
  type VoiceTelephonyProvider,
  voice,
} from "@absolutejs/voice";
import { assemblyai } from "@absolutejs/voice-assemblyai";
import { deepgram } from "@absolutejs/voice-deepgram";
import { gemini } from "@absolutejs/voice-gemini";
import { openai } from "@absolutejs/voice-openai";
import { createVoiceProviderFailureSimulator } from "@absolutejs/voice/testing";
import { resolve } from "node:path";
import {
  base64FromBytes,
  demoGuardrailPolicies,
  guardrailBlockedResult,
  rawDeliveryTraceStore,
  runtimeDirectory,
} from "./stores";

const deepgramApiKey = getEnv("DEEPGRAM_API_KEY");

const assemblyAIApiKey = process.env.ASSEMBLYAI_API_KEY;

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

const openAIApiKey = process.env.OPENAI_API_KEY;

const realtimeChannelFormat = {
  channels: 1,
  container: "raw",
  encoding: "pcm_s16le",
  sampleRateHz: 24_000,
} as const;

const publicBaseUrl = process.env.VOICE_DEMO_PUBLIC_BASE_URL;

const carrierReadinessMode =
  process.env.VOICE_DEMO_CARRIER_READINESS === "production"
    ? "production"
    : "local";

const requireProductionCarrierReadiness = carrierReadinessMode === "production";

const handoffWebhookUrl = process.env.VOICE_DEMO_HANDOFF_WEBHOOK_URL;

const telephonyWebhookSigningSecret =
  process.env.VOICE_DEMO_TELEPHONY_WEBHOOK_SECRET;

const telnyxPublicKey = process.env.TELNYX_PUBLIC_KEY;

const runTelephonyWebhookVerificationProof = async () => {
  const attempts: Array<{
    decisions: number;
    provider: VoiceTelephonyProvider;
    rejected: boolean;
    replayRejected?: boolean;
    sideEffects: number;
    status: number;
    verification?: { ok: false; reason: "invalid-signature" };
  }> = [];

  const twilioPath = "/carrier";
  const twilioUrl = "https://voice.example.test/carrier";
  const twilioBody = {
    CallSid: `proof-twilio-verification-${crypto.randomUUID()}`,
    CallStatus: "busy",
    SipResponseCode: "486",
  };
  const telnyxBody = {
    data: {
      id: `proof-telnyx-verification-${crypto.randomUUID()}`,
      payload: {
        call_control_id: "proof-telnyx-verification-control",
        call_session_id: "proof-telnyx-verification-session",
        status: "completed",
      },
    },
  };
  const telnyxRawBody = JSON.stringify(telnyxBody);
  const telnyxTimestamp = String(Math.floor(Date.now() / 1000));
  const staleTelnyxTimestamp = String(Math.floor(Date.now() / 1000) - 600);
  const telnyxKeyPair = (await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const telnyxPublicKey = base64FromBytes(
    await crypto.subtle.exportKey("raw", telnyxKeyPair.publicKey),
  );
  const telnyxSignature = base64FromBytes(
    await crypto.subtle.sign(
      "Ed25519",
      telnyxKeyPair.privateKey,
      new TextEncoder().encode(`${telnyxTimestamp}|${telnyxRawBody}`),
    ),
  );
  const staleTelnyxSignature = base64FromBytes(
    await crypto.subtle.sign(
      "Ed25519",
      telnyxKeyPair.privateKey,
      new TextEncoder().encode(`${staleTelnyxTimestamp}|${telnyxRawBody}`),
    ),
  );
  const proofWebhookSecurity = createVoiceTelephonyWebhookSecurityPreset({
    plivo: {
      authToken: "proof-plivo-secret",
    },
    store: {
      kind: "sqlite",
      path: resolve(runtimeDirectory, "telephony-webhook-security.sqlite"),
    },
    telnyx: {
      publicKey: telnyxPublicKey,
      toleranceSeconds: 300,
    },
    ttlSeconds: 300,
    twilio: {
      authToken: "proof-secret",
      verificationUrl: twilioUrl,
    },
  });
  let twilioDecisions = 0;
  const twilioRoutes = createVoiceTelephonyWebhookRoutes({
    idempotency: proofWebhookSecurity.twilio.idempotency,
    onDecision: () => {
      twilioDecisions += 1;
    },
    path: twilioPath,
    provider: "twilio",
    verify: proofWebhookSecurity.verify.twilio,
  });
  const twilioInvalidBefore = twilioDecisions;
  const twilioInvalidResponse = await twilioRoutes.handle(
    new Request(twilioUrl, {
      body: new URLSearchParams(twilioBody),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": "invalid-signature",
      },
      method: "POST",
    }),
  );
  const twilioInvalidBody = (await twilioInvalidResponse.json()) as {
    verification?: { ok: false; reason: "invalid-signature" };
  };
  attempts.push({
    decisions: twilioDecisions - twilioInvalidBefore,
    provider: "twilio",
    rejected: twilioInvalidResponse.status === 401,
    sideEffects: twilioDecisions - twilioInvalidBefore,
    status: twilioInvalidResponse.status,
    verification: twilioInvalidBody.verification,
  });
  const twilioValidSignature = await signVoiceTwilioWebhook({
    authToken: "proof-secret",
    body: twilioBody,
    url: twilioUrl,
  });
  const twilioValidBefore = twilioDecisions;
  const twilioValidResponse = await twilioRoutes.handle(
    new Request(twilioUrl, {
      body: new URLSearchParams(twilioBody),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": twilioValidSignature,
      },
      method: "POST",
    }),
  );
  attempts.push({
    decisions: twilioDecisions - twilioValidBefore,
    provider: "twilio",
    rejected: false,
    sideEffects: twilioDecisions - twilioValidBefore,
    status: twilioValidResponse.status,
  });

  let telnyxDecisions = 0;
  const telnyxRoutes = createVoiceTelephonyWebhookRoutes({
    onDecision: () => {
      telnyxDecisions += 1;
    },
    path: "/telnyx",
    provider: "telnyx",
    verify: proofWebhookSecurity.verify.telnyx,
  });
  const telnyxInvalidBefore = telnyxDecisions;
  const telnyxInvalidResponse = await telnyxRoutes.handle(
    new Request("https://voice.example.test/telnyx", {
      body: telnyxRawBody,
      headers: {
        "content-type": "application/json",
        "telnyx-signature-ed25519": "invalid-signature",
        "telnyx-timestamp": telnyxTimestamp,
      },
      method: "POST",
    }),
  );
  const telnyxInvalidBody = (await telnyxInvalidResponse.json()) as {
    verification?: { ok: false; reason: "invalid-signature" };
  };
  attempts.push({
    decisions: telnyxDecisions - telnyxInvalidBefore,
    provider: "telnyx",
    rejected: telnyxInvalidResponse.status === 401,
    sideEffects: telnyxDecisions - telnyxInvalidBefore,
    status: telnyxInvalidResponse.status,
    verification: telnyxInvalidBody.verification,
  });
  const telnyxStaleBefore = telnyxDecisions;
  const telnyxStaleResponse = await telnyxRoutes.handle(
    new Request("https://voice.example.test/telnyx", {
      body: telnyxRawBody,
      headers: {
        "content-type": "application/json",
        "telnyx-signature-ed25519": staleTelnyxSignature,
        "telnyx-timestamp": staleTelnyxTimestamp,
      },
      method: "POST",
    }),
  );
  const telnyxStaleBody = (await telnyxStaleResponse.json()) as {
    verification?: { ok: false; reason: "invalid-signature" };
  };
  attempts.push({
    decisions: telnyxDecisions - telnyxStaleBefore,
    provider: "telnyx",
    rejected: telnyxStaleResponse.status === 401,
    replayRejected: true,
    sideEffects: telnyxDecisions - telnyxStaleBefore,
    status: telnyxStaleResponse.status,
    verification: telnyxStaleBody.verification,
  });
  const telnyxValidBefore = telnyxDecisions;
  const telnyxValidResponse = await telnyxRoutes.handle(
    new Request("https://voice.example.test/telnyx", {
      body: telnyxRawBody,
      headers: {
        "content-type": "application/json",
        "telnyx-signature-ed25519": telnyxSignature,
        "telnyx-timestamp": telnyxTimestamp,
      },
      method: "POST",
    }),
  );
  attempts.push({
    decisions: telnyxDecisions - telnyxValidBefore,
    provider: "telnyx",
    rejected: false,
    sideEffects: telnyxDecisions - telnyxValidBefore,
    status: telnyxValidResponse.status,
  });
  const telnyxReplayBefore = telnyxDecisions;
  const telnyxReplayResponse = await telnyxRoutes.handle(
    new Request("https://voice.example.test/telnyx", {
      body: telnyxRawBody,
      headers: {
        "content-type": "application/json",
        "telnyx-signature-ed25519": telnyxSignature,
        "telnyx-timestamp": telnyxTimestamp,
      },
      method: "POST",
    }),
  );
  const telnyxReplayBody = (await telnyxReplayResponse.json()) as {
    verification?: { ok: false; reason: "invalid-signature" };
  };
  attempts.push({
    decisions: telnyxDecisions - telnyxReplayBefore,
    provider: "telnyx",
    rejected: telnyxReplayResponse.status === 401,
    replayRejected: true,
    sideEffects: telnyxDecisions - telnyxReplayBefore,
    status: telnyxReplayResponse.status,
    verification: telnyxReplayBody.verification,
  });

  const plivoBody = {
    CallUUID: "proof-plivo-verification",
    SessionId: "proof-plivo-verification-session",
    status: "completed",
  };
  const plivoNonce = `proof-plivo-nonce-${crypto.randomUUID()}`;
  const plivoUrl = "https://voice.example.test/plivo";
  const plivoSignature = await signVoicePlivoWebhook({
    authToken: "proof-plivo-secret",
    body: plivoBody,
    nonce: plivoNonce,
    url: plivoUrl,
  });
  let plivoDecisions = 0;
  const plivoRoutes = createVoiceTelephonyWebhookRoutes({
    onDecision: () => {
      plivoDecisions += 1;
    },
    path: "/plivo",
    provider: "plivo",
    verify: proofWebhookSecurity.verify.plivo,
  });
  const plivoInvalidBefore = plivoDecisions;
  const plivoInvalidResponse = await plivoRoutes.handle(
    new Request(plivoUrl, {
      body: new URLSearchParams(plivoBody),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-plivo-signature-v3": "invalid-signature",
        "x-plivo-signature-v3-nonce": plivoNonce,
      },
      method: "POST",
    }),
  );
  const plivoInvalidBody = (await plivoInvalidResponse.json()) as {
    verification?: { ok: false; reason: "invalid-signature" };
  };
  attempts.push({
    decisions: plivoDecisions - plivoInvalidBefore,
    provider: "plivo",
    rejected: plivoInvalidResponse.status === 401,
    sideEffects: plivoDecisions - plivoInvalidBefore,
    status: plivoInvalidResponse.status,
    verification: plivoInvalidBody.verification,
  });
  const plivoValidBefore = plivoDecisions;
  const plivoValidResponse = await plivoRoutes.handle(
    new Request(plivoUrl, {
      body: new URLSearchParams(plivoBody),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-plivo-signature-v3": plivoSignature,
        "x-plivo-signature-v3-nonce": plivoNonce,
      },
      method: "POST",
    }),
  );
  attempts.push({
    decisions: plivoDecisions - plivoValidBefore,
    provider: "plivo",
    rejected: false,
    sideEffects: plivoDecisions - plivoValidBefore,
    status: plivoValidResponse.status,
  });
  const plivoReplayBefore = plivoDecisions;
  const plivoReplayResponse = await plivoRoutes.handle(
    new Request(plivoUrl, {
      body: new URLSearchParams(plivoBody),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-plivo-signature-v3": plivoSignature,
        "x-plivo-signature-v3-nonce": plivoNonce,
      },
      method: "POST",
    }),
  );
  const plivoReplayBody = (await plivoReplayResponse.json()) as {
    verification?: { ok: false; reason: "invalid-signature" };
  };
  attempts.push({
    decisions: plivoDecisions - plivoReplayBefore,
    provider: "plivo",
    rejected: plivoReplayResponse.status === 401,
    replayRejected: true,
    sideEffects: plivoDecisions - plivoReplayBefore,
    status: plivoReplayResponse.status,
    verification: plivoReplayBody.verification,
  });

  return {
    attempts,
    ok: attempts.every((attempt) =>
      attempt.rejected
        ? attempt.status === 401 && attempt.sideEffects === 0
        : attempt.status === 200 && attempt.sideEffects === 1,
    ),
  };
};

const plivoAuthToken = process.env.PLIVO_AUTH_TOKEN;

const webhookSigningSecret = process.env.VOICE_DEMO_WEBHOOK_SECRET;

const webhookUrl = process.env.VOICE_DEMO_WEBHOOK_URL;

const requestedModelProvider = process.env.VOICE_MODEL_PROVIDER?.toLowerCase();

const readPositiveNumberEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const providerLatencyBudgets = {
  anthropic: readPositiveNumberEnv("VOICE_ANTHROPIC_TIMEOUT_MS", 6_000),
  deterministic: readPositiveNumberEnv("VOICE_DETERMINISTIC_TIMEOUT_MS", 500),
  gemini: readPositiveNumberEnv("VOICE_GEMINI_TIMEOUT_MS", 6_000),
  openai: readPositiveNumberEnv("VOICE_OPENAI_TIMEOUT_MS", 6_000),
} satisfies Record<VoiceModelProvider, number>;

const sttLatencyBudgets = {
  assemblyai: readPositiveNumberEnv("VOICE_ASSEMBLYAI_STT_TIMEOUT_MS", 6_000),
  deepgram: readPositiveNumberEnv("VOICE_DEEPGRAM_STT_TIMEOUT_MS", 5_000),
};

type VoiceSTTProvider = "deepgram" | "assemblyai";

const sessionRoutingModes = new Map<string, VoiceRoutingMode>();

const sessionVoiceProfileIds = new Map<string, string>();

const profileTaggedTraceStore = createVoiceProfileTraceTagger({
  profiles: [
    {
      description:
        "Browser recorder with longer passive listening and transcript capture.",
      id: "meeting-recorder",
      label: "Meeting recorder",
    },
    {
      description:
        "Realtime support agent with fast interruption recovery and tool-ready turns.",
      id: "support-agent",
      label: "Support agent",
    },
    {
      description:
        "Appointment scheduler with short structured turns and reliable follow-up capture.",
      id: "appointment-scheduler",
      label: "Appointment scheduler",
    },
    {
      description:
        "Noisy phone call with stricter transport and interruption proof requirements.",
      id: "noisy-phone-call",
      label: "Noisy phone call",
    },
  ],
  resolveProfile: (event) => sessionVoiceProfileIds.get(event.sessionId),
  store: rawDeliveryTraceStore,
});

const deliveryTraceStore = createVoiceRealCallProfileTraceCollector({
  profileDescriptions: {
    "meeting-recorder":
      "Default real browser or phone call profile inferred from the shared trace store.",
    "support-agent":
      "Realtime support agent with fast interruption recovery and tool-ready turns.",
  },
  profileLabels: {
    "meeting-recorder": "Meeting recorder",
    "support-agent": "Support agent",
  },
  store: profileTaggedTraceStore,
});

const demoLiveGuardrails = createVoiceGuardrailRuntime<
  unknown,
  VoiceSessionRecord,
  SavedIntake
>({
  blockResult: ({ context, decision, session }) =>
    guardrailBlockedResult(
      session,
      context,
      `guardrail-blocked-${decision.stage}`,
    ),
  name: "absolutejs-voice-example-live",
  policies: demoGuardrailPolicies,
  trace: deliveryTraceStore,
});

const configuredModelProviders: VoiceModelProvider[] = [
  "deterministic",
  openAIApiKey ? "openai" : undefined,
  anthropicApiKey ? "anthropic" : undefined,
  geminiApiKey ? "gemini" : undefined,
].filter(Boolean) as VoiceModelProvider[];

const configuredSTTProviders: VoiceSTTProvider[] = [
  "deepgram",
  assemblyAIApiKey ? "assemblyai" : undefined,
].filter(Boolean) as VoiceSTTProvider[];

const selectedSTTProvider: VoiceSTTProvider = "deepgram";

const voiceProviderModels = {
  anthropic: process.env.ANTHROPIC_VOICE_MODEL ?? "claude-sonnet-4-5",
  assemblyai: process.env.ASSEMBLYAI_SPEECH_MODEL ?? "u3-rt-pro",
  deepgram: "flux-general-en",
  deterministic: "local deterministic support model",
  gemini: process.env.GEMINI_VOICE_MODEL ?? "gemini-2.5-flash",
  openai: process.env.OPENAI_VOICE_MODEL ?? "gpt-4.1-mini",
} satisfies Record<VoiceModelProvider | VoiceSTTProvider, string>;

type VoiceTTSProvider = "openai" | "emergency";

const createEmergencyTelephonyTTS = (): TTSAdapter => ({
  kind: "tts",
  open: (): TTSAdapterSession => {
    const listeners = {
      audio: new Set<
        (payload: {
          chunk: Uint8Array;
          format: {
            channels: 1;
            container: "raw";
            encoding: "pcm_s16le";
            sampleRateHz: number;
          };
          receivedAt: number;
          type: "audio";
        }) => void
      >(),
      close: new Set<(payload: { reason?: string; type: "close" }) => void>(),
      error: new Set<
        (payload: { error: Error; recoverable: boolean; type: "error" }) => void
      >(),
    };

    return {
      close: async (reason?: string) => {
        for (const handler of listeners.close) {
          handler({ reason, type: "close" });
        }
      },
      on: (event, handler) => {
        (listeners[event] as Set<typeof handler>).add(handler as never);
        return () => {
          (listeners[event] as Set<typeof handler>).delete(handler as never);
        };
      },
      send: async () => {
        const sampleRateHz = 16_000;
        const durationMs = 500;
        const samples = Math.floor((sampleRateHz * durationMs) / 1_000);
        const chunk = new Uint8Array(samples * 2);
        const view = new DataView(chunk.buffer);
        for (let index = 0; index < samples; index += 1) {
          const envelope = Math.sin((Math.PI * index) / samples);
          const tone = Math.sin((2 * Math.PI * 660 * index) / sampleRateHz);
          view.setInt16(index * 2, Math.round(tone * envelope * 5_000), true);
        }
        for (const handler of listeners.audio) {
          handler({
            chunk,
            format: {
              channels: 1,
              container: "raw",
              encoding: "pcm_s16le",
              sampleRateHz,
            },
            receivedAt: Date.now(),
            type: "audio",
          });
        }
      },
    };
  },
});

const openAITelephonyTTS = openAIApiKey
  ? createOpenAIVoiceTTS({
      apiKey: openAIApiKey,
      instructions:
        "Speak like a concise phone support agent. Keep the tone natural, clear, and calm. Avoid long pauses.",
      model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE ?? "marin",
    })
  : undefined;

const configuredTTSProviders: VoiceTTSProvider[] = [
  openAITelephonyTTS ? "openai" : undefined,
  "emergency",
].filter(Boolean) as VoiceTTSProvider[];

const ttsLatencyBudgets = {
  emergency: 500,
  openai: readPositiveNumberEnv("VOICE_OPENAI_TTS_TIMEOUT_MS", 6_000),
} satisfies Record<VoiceTTSProvider, number>;

const voiceProviderFeatures = {
  anthropic: ["tool calling", "JSON result shaping", "fallback routing"],
  assemblyai: ["realtime STT", "VAD events", "turn formatting", "fallback STT"],
  deepgram: ["Flux realtime STT", "VAD events", "smart formatting"],
  deterministic: [
    "tool calling",
    "JSON result shaping",
    "fallback routing",
    "offline demo mode",
    "zero external dependency",
  ],
  gemini: ["tool calling", "JSON result shaping", "fallback routing"],
  openai: ["tool calling", "JSON result shaping", "fallback routing"],
} satisfies Record<VoiceModelProvider | VoiceSTTProvider, string[]>;

const voiceProviderStackCapabilities = {
  llm: {
    anthropic: voiceProviderFeatures.anthropic,
    deterministic: voiceProviderFeatures.deterministic,
    gemini: voiceProviderFeatures.gemini,
    openai: voiceProviderFeatures.openai,
  },
  stt: {
    assemblyai: voiceProviderFeatures.assemblyai,
    deepgram: voiceProviderFeatures.deepgram,
  },
  tts: {
    emergency: [
      "streaming speech",
      "barge-in friendly",
      "spoken playback",
      "offline fallback",
    ],
    openai: ["streaming speech", "barge-in friendly", "spoken playback"],
  },
};

type DemoProviderOrchestrationSurface =
  | "background-summary"
  | "live-call"
  | "live-stt"
  | "telephony-tts";

type DemoProviderOrchestrationProvider =
  | VoiceModelProvider
  | VoiceSTTProvider
  | VoiceTTSProvider;

const providerOrchestrationProfile = createVoiceProviderOrchestrationProfile<
  unknown,
  VoiceSessionRecord,
  DemoProviderOrchestrationProvider,
  DemoProviderOrchestrationSurface
>({
  defaultSurface: "live-call",
  id: "absolutejs-voice-demo-provider-orchestration",
  surfaces: {
    "background-summary": {
      fallback: configuredModelProviders.includes("gemini")
        ? [
            "gemini",
            ...configuredModelProviders.filter(
              (provider) => provider !== "gemini",
            ),
          ]
        : configuredModelProviders,
      maxCost: configuredModelProviders.includes("gemini") ? 2 : 3,
      minQuality: 0.7,
      policy: "cost-cap",
      providerProfiles: {
        anthropic: {
          cost: 3,
          latencyMs: 700,
          priority: 2,
          quality: 0.95,
          timeoutMs: providerLatencyBudgets.anthropic,
        },
        deterministic: {
          cost: 0,
          latencyMs: 5,
          priority: 4,
          quality: 0.72,
          timeoutMs: providerLatencyBudgets.deterministic,
        },
        gemini: {
          cost: 1,
          latencyMs: 650,
          priority: 3,
          quality: 0.86,
          timeoutMs: providerLatencyBudgets.gemini,
        },
        openai: {
          cost: 2,
          latencyMs: 500,
          priority: 1,
          quality: 0.92,
          timeoutMs: providerLatencyBudgets.openai,
        },
      },
    },
    "live-call": {
      fallback: configuredModelProviders,
      maxLatencyMs: 900,
      minQuality: 0.7,
      policy: "latency-first",
      providerHealth: {
        cooldownMs: 30_000,
        failureThreshold: 1,
        rateLimitCooldownMs: 120_000,
      },
      providerProfiles: {
        anthropic: {
          cost: 3,
          latencyMs: 700,
          priority: 2,
          quality: 0.95,
          timeoutMs: providerLatencyBudgets.anthropic,
        },
        deterministic: {
          cost: 0,
          latencyMs: 5,
          priority: 4,
          quality: 0.72,
          timeoutMs: providerLatencyBudgets.deterministic,
        },
        gemini: {
          cost: 1,
          latencyMs: 650,
          priority: 3,
          quality: 0.86,
          timeoutMs: providerLatencyBudgets.gemini,
        },
        openai: {
          cost: 2,
          latencyMs: 500,
          priority: 1,
          quality: 0.92,
          timeoutMs: providerLatencyBudgets.openai,
        },
      },
      timeoutMs: 6_000,
    },
    "live-stt": {
      fallback: configuredSTTProviders,
      maxLatencyMs: 900,
      minQuality: 0.85,
      policy: "latency-first",
      providerHealth: {
        cooldownMs: 30_000,
        failureThreshold: 1,
      },
      providerProfiles: {
        assemblyai: {
          cost: 2,
          latencyMs: 450,
          priority: 2,
          quality: 0.88,
          timeoutMs: sttLatencyBudgets.assemblyai,
        },
        deepgram: {
          cost: 4,
          latencyMs: 250,
          priority: 1,
          quality: 0.94,
          timeoutMs: sttLatencyBudgets.deepgram,
        },
      },
    },
    "telephony-tts": {
      fallback: openAITelephonyTTS ? ["openai", "emergency"] : ["emergency"],
      maxLatencyMs: 1_200,
      policy: "latency-first",
      providerHealth: {
        cooldownMs: 30_000,
        failureThreshold: 1,
      },
      providerProfiles: {
        emergency: {
          cost: 0,
          latencyMs: 5,
          priority: 2,
          quality: 0.2,
          timeoutMs: ttsLatencyBudgets.emergency,
        },
        openai: {
          cost: 2,
          latencyMs: 500,
          priority: 1,
          quality: 0.9,
          timeoutMs: ttsLatencyBudgets.openai,
        },
      },
    },
  },
});

const providerOrchestrationRequirements = {
  "background-summary": {
    minProviders: 1,
    requireBudgetPolicy: true,
    requireFallback: true,
    requireTimeoutBudget: true,
  },
  "live-call": {
    minProviders: 1,
    requireBudgetPolicy: true,
    requireCircuitBreaker: true,
    requireFallback: true,
    requireTimeoutBudget: true,
  },
  "live-stt": {
    minProviders: 1,
    requireBudgetPolicy: true,
    requireCircuitBreaker: true,
    requireFallback: true,
    requireTimeoutBudget: true,
  },
  "telephony-tts": {
    minProviders: 1,
    requireBudgetPolicy: true,
    requireCircuitBreaker: true,
    requireFallback: true,
    requireTimeoutBudget: true,
  },
} as const;

const buildDemoProviderOrchestrationReport =
  (): VoiceProviderOrchestrationReport =>
    buildVoiceProviderOrchestrationReport({
      profile: providerOrchestrationProfile,
      requirements: providerOrchestrationRequirements,
    });

const resolveModelProvider = () => {
  if (
    requestedModelProvider === "openai" ||
    requestedModelProvider === "anthropic" ||
    requestedModelProvider === "gemini" ||
    requestedModelProvider === "deterministic"
  ) {
    if (requestedModelProvider === "openai" && !openAIApiKey) {
      throw new Error("VOICE_MODEL_PROVIDER=openai requires OPENAI_API_KEY.");
    }
    if (requestedModelProvider === "anthropic" && !anthropicApiKey) {
      throw new Error(
        "VOICE_MODEL_PROVIDER=anthropic requires ANTHROPIC_API_KEY.",
      );
    }
    if (requestedModelProvider === "gemini" && !geminiApiKey) {
      throw new Error(
        "VOICE_MODEL_PROVIDER=gemini requires GEMINI_API_KEY or GOOGLE_API_KEY.",
      );
    }
    return requestedModelProvider;
  }

  if (openAIApiKey) {
    return "openai";
  }
  if (anthropicApiKey) {
    return "anthropic";
  }
  if (geminiApiKey) {
    return "gemini";
  }
  return "deterministic";
};

const modelProvider = resolveModelProvider();

const buildDemoProviderContractDefinitions = () =>
  createVoiceProviderContractMatrixPreset("phone-agent", {
    capabilities: voiceProviderStackCapabilities,
    configured: {
      anthropic: Boolean(anthropicApiKey),
      assemblyai: Boolean(assemblyAIApiKey),
      deepgram: Boolean(deepgramApiKey),
      deterministic: true,
      gemini: Boolean(geminiApiKey),
      openai: Boolean(openAIApiKey),
      emergency: true,
    },
    env: {
      ...process.env,
      GEMINI_API_KEY: geminiApiKey,
    },
    latencyBudgets: {
      ...providerLatencyBudgets,
      ...sttLatencyBudgets,
      ...ttsLatencyBudgets,
    },
    providers: {
      llm: configuredModelProviders,
      stt: configuredSTTProviders,
      tts: configuredTTSProviders,
    },
    remediationHref: "/provider-contracts",
    selected: {
      llm: modelProvider,
      stt: selectedSTTProvider,
      tts: openAITelephonyTTS ? "openai" : "emergency",
    },
    streaming: {
      anthropic: true,
      assemblyai: true,
      deepgram: true,
      deterministic: true,
      emergency: true,
      gemini: true,
      openai: true,
    },
  }).contracts;

const buildDemoProviderContractMatrix = () =>
  buildVoiceProviderContractMatrix({
    contracts: buildDemoProviderContractDefinitions(),
  });

const assistantConfig = {
  ...VOICE_ASSISTANT_CONFIG,
  availableProviders: configuredModelProviders,
  modelProvider,
};

const isAssistantProviderError = (error: unknown) =>
  error instanceof Error &&
  /\b(OpenAI|Anthropic|Gemini)\b.*\b(HTTP|failed|Unable to connect)/i.test(
    error.message,
  );

const providerFallbackOrder = (provider: VoiceModelProvider) => [
  provider,
  ...(["openai", "anthropic", "gemini", "deterministic"] as const).filter(
    (candidate) =>
      candidate !== provider && configuredModelProviders.includes(candidate),
  ),
];

const voiceProfileProviderAliases = {
  "llm:deterministic+openai": ["openai", "deterministic"],
  "deterministic+openai": ["openai", "deterministic"],
} satisfies Record<string, readonly VoiceModelProvider[]>;

const queryFromContext = (context: unknown) =>
  context &&
  typeof context === "object" &&
  "query" in context &&
  context.query &&
  typeof context.query === "object"
    ? (context.query as Record<PropertyKey, unknown>)
    : undefined;

const readQueryString = (
  query: Record<PropertyKey, unknown> | undefined,
  keys: readonly string[],
) => {
  for (const key of keys) {
    const value = query?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const resolveVoiceProfileIdFromContext = (context: unknown) => {
  const query = queryFromContext(context);
  const explicit = readQueryString(query, [
    "voiceProfile",
    "profileId",
    "callProfile",
  ]);
  if (explicit) {
    return explicit;
  }

  const scenarioId = readQueryString(query, ["scenarioId"]);
  return scenarioId === "guided" ? "support-agent" : "meeting-recorder";
};

const rememberSessionVoiceProfileId = (input: {
  context: unknown;
  sessionId: string;
}) => {
  const existing = sessionVoiceProfileIds.get(input.sessionId);
  if (existing) {
    return existing;
  }

  const profileId = resolveVoiceProfileIdFromContext(input.context);
  sessionVoiceProfileIds.set(input.sessionId, profileId);
  return profileId;
};

const intakeModel: VoiceAgentModel<unknown, VoiceSessionRecord, SavedIntake> = {
  generate: ({ context, session, turn, system }) => {
    const result = decideIntakeTurn(session, turn, undefined, context);

    if (system?.includes("direct") && result.assistantText === "Received.") {
      return {
        ...result,
        assistantText: "Captured.",
      };
    }

    return result;
  },
};

const openAIModel = openAIApiKey
  ? createOpenAIVoiceAssistantModel<unknown, VoiceSessionRecord, SavedIntake>({
      apiKey: openAIApiKey,
      model: process.env.OPENAI_VOICE_MODEL ?? "gpt-4.1-mini",
    })
  : undefined;

const anthropicModel = anthropicApiKey
  ? createAnthropicVoiceAssistantModel<
      unknown,
      VoiceSessionRecord,
      SavedIntake
    >({
      apiKey: anthropicApiKey,
      model: process.env.ANTHROPIC_VOICE_MODEL ?? "claude-sonnet-4-5",
    })
  : undefined;

const geminiModel = geminiApiKey
  ? createGeminiVoiceAssistantModel<unknown, VoiceSessionRecord, SavedIntake>({
      apiKey: geminiApiKey,
      model: process.env.GEMINI_VOICE_MODEL ?? "gemini-2.5-flash",
    })
  : undefined;

const resolveRequestedProvider = (context: unknown): VoiceModelProvider => {
  if (
    context &&
    typeof context === "object" &&
    "query" in context &&
    context.query &&
    typeof context.query === "object" &&
    "provider" in context.query &&
    isVoiceModelProvider(context.query.provider) &&
    configuredModelProviders.includes(context.query.provider)
  ) {
    return context.query.provider;
  }

  return modelProvider;
};

const providerModels: Partial<
  Record<
    VoiceModelProvider,
    VoiceAgentModel<unknown, VoiceSessionRecord, SavedIntake>
  >
> = {
  deterministic: intakeModel,
  openai: openAIModel,
  anthropic: anthropicModel,
  gemini: geminiModel,
};

const traceProviderEvent = async (
  event: VoiceProviderRouterEvent<VoiceModelProvider>,
  input: Parameters<
    VoiceAgentModel<unknown, VoiceSessionRecord, SavedIntake>["generate"]
  >[0],
) => {
  await appendVoiceProviderRouterTraceEvent({
    event,
    scenarioId: input.session.scenarioId,
    sessionId: input.session.id,
    store: deliveryTraceStore,
    turnId: input.turn.id,
  });
};

const sttProviderAdapters = {
  deepgram: deepgram({
    apiKey: deepgramApiKey,
    interimResults: true,
    model: "flux-general-en",
    punctuate: true,
    smartFormat: true,
    vadEvents: true,
  }),
  ...(assemblyAIApiKey
    ? {
        assemblyai: assemblyai({
          apiKey: assemblyAIApiKey,
          formatTurns: true,
          speechModel: process.env.ASSEMBLYAI_SPEECH_MODEL ?? "u3-rt-pro",
        }),
      }
    : {}),
} satisfies Partial<Record<VoiceSTTProvider, STTAdapter>>;

const traceSTTProviderEvent = async (
  event: VoiceIOProviderRouterEvent<VoiceSTTProvider>,
  input: { sessionId: string },
) => {
  const routing = sessionRoutingModes.get(input.sessionId) ?? "balanced";
  await appendVoiceIOProviderRouterTraceEvent({
    event,
    payload: {
      routing,
    },
    sessionId: input.sessionId,
    store: deliveryTraceStore,
  });
};

const rememberSessionRoutingMode = async (input: {
  context: unknown;
  sessionId: string;
}) => {
  const query = queryFromContext(input.context);
  const routing =
    query && "routing" in query && isVoiceRoutingMode(query.routing)
      ? query.routing
      : "balanced";

  sessionRoutingModes.set(input.sessionId, routing);
  rememberSessionVoiceProfileId(input);
  return routing;
};

const providerFailureSimulator = createVoiceProviderFailureSimulator({
  allowProviders: () => configuredModelProviders,
  fallback: providerFallbackOrder,
  isProviderError: (error, provider) =>
    provider !== "deterministic" && isAssistantProviderError(error),
  onProviderEvent: traceProviderEvent,
  providerLabel: (provider) =>
    provider === "openai"
      ? "OpenAI"
      : provider === "anthropic"
        ? "Anthropic"
        : provider === "gemini"
          ? "Gemini"
          : "Deterministic",
  providers: configuredModelProviders,
});

const runDemoProviderRoutingContract = async () => {
  const events: StoredVoiceTraceEvent[] = [];
  const requestedProvider: VoiceModelProvider =
    configuredModelProviders.includes("openai")
      ? "openai"
      : (configuredModelProviders[0] ?? "deterministic");
  const fallbackProvider = providerFallbackOrder(requestedProvider).find(
    (provider) => provider !== requestedProvider,
  );
  const simulator = createVoiceProviderFailureSimulator({
    allowProviders: () => configuredModelProviders,
    fallback: providerFallbackOrder,
    isProviderError: (error, provider) =>
      provider !== "deterministic" && isAssistantProviderError(error),
    onProviderEvent: async (event, input) => {
      events.push(
        buildVoiceProviderRouterTraceEvent({
          event,
          id: `${input.session.id}:${input.turn.id}:${event.provider}:${event.status}:${event.at}`,
          scenarioId: "provider-routing-contract",
          sessionId: input.session.id,
          turnId: input.turn.id,
        }),
      );
    },
    providerLabel: (provider) =>
      provider === "openai"
        ? "OpenAI"
        : provider === "anthropic"
          ? "Anthropic"
          : provider === "gemini"
            ? "Gemini"
            : "Deterministic",
    providers: configuredModelProviders,
    replayHref: false,
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
              kind: "llm",
              provider: requestedProvider,
              selectedProvider: requestedProvider,
              status: "error",
            },
            {
              kind: "llm",
              provider: fallbackProvider,
              selectedProvider: requestedProvider,
              status: "fallback",
            },
          ]
        : [
            {
              kind: "llm",
              provider: requestedProvider,
              selectedProvider: requestedProvider,
              status: "success",
            },
          ],
      id: fallbackProvider
        ? `${requestedProvider}-to-${fallbackProvider}-fallback`
        : `${requestedProvider}-success`,
      label: "Demo LLM provider fallback",
      scenarioId: "provider-routing-contract",
    },
    events,
  });
};

export {
  anthropicApiKey,
  anthropicModel,
  assemblyAIApiKey,
  assistantConfig,
  buildDemoProviderContractDefinitions,
  buildDemoProviderContractMatrix,
  buildDemoProviderOrchestrationReport,
  carrierReadinessMode,
  configuredModelProviders,
  configuredSTTProviders,
  configuredTTSProviders,
  createEmergencyTelephonyTTS,
  deepgramApiKey,
  deliveryTraceStore,
  demoLiveGuardrails,
  geminiApiKey,
  geminiModel,
  handoffWebhookUrl,
  intakeModel,
  isAssistantProviderError,
  modelProvider,
  openAIApiKey,
  openAIModel,
  openAITelephonyTTS,
  plivoAuthToken,
  profileTaggedTraceStore,
  providerFailureSimulator,
  providerFallbackOrder,
  providerLatencyBudgets,
  providerModels,
  providerOrchestrationProfile,
  providerOrchestrationRequirements,
  publicBaseUrl,
  queryFromContext,
  readPositiveNumberEnv,
  readQueryString,
  realtimeChannelFormat,
  rememberSessionRoutingMode,
  rememberSessionVoiceProfileId,
  requestedModelProvider,
  requireProductionCarrierReadiness,
  resolveModelProvider,
  resolveRequestedProvider,
  resolveVoiceProfileIdFromContext,
  runDemoProviderRoutingContract,
  runTelephonyWebhookVerificationProof,
  selectedSTTProvider,
  sessionRoutingModes,
  sessionVoiceProfileIds,
  sttLatencyBudgets,
  sttProviderAdapters,
  telephonyWebhookSigningSecret,
  telnyxPublicKey,
  traceProviderEvent,
  traceSTTProviderEvent,
  ttsLatencyBudgets,
  voiceProfileProviderAliases,
  voiceProviderFeatures,
  voiceProviderModels,
  voiceProviderStackCapabilities,
  webhookSigningSecret,
  webhookUrl,
};
export type {
  DemoProviderOrchestrationProvider,
  DemoProviderOrchestrationSurface,
  VoiceSTTProvider,
  VoiceTTSProvider,
};
