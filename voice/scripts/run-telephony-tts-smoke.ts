import {
  createOpenAIVoiceTTS,
  createPlivoMediaStreamBridge,
  createTelnyxMediaStreamBridge,
  createTwilioMediaStreamBridge,
  createVoiceMemoryStore,
  createVoiceTTSProviderRouter,
  encodeTwilioMulawBase64,
  type AudioChunk,
  type STTAdapter,
  type STTAdapterOpenOptions,
  type STTAdapterSession,
  type TTSAdapter,
  type TTSAdapterSession,
  type Transcript,
} from "@absolutejs/voice";

type ProviderSmoke = {
  isAudio: (message: Record<string, unknown>) => boolean;
  name: "twilio" | "telnyx" | "plivo";
  run: (socket: SmokeSocket, options: BridgeOptions) => Promise<SmokeBridge>;
};

type SmokeSocket = {
  close: (code?: number, reason?: string) => void;
  send: (data: string) => void;
};

type SmokeBridge = {
  close: (reason?: string) => Promise<void>;
};

type BridgeOptions = Parameters<typeof createTwilioMediaStreamBridge>[1];

const timeoutMs = Number(process.env.TELEPHONY_TTS_SMOKE_TIMEOUT_MS ?? 20_000);
const shouldSkipWithoutOpenAI =
  process.env.TELEPHONY_TTS_SMOKE_REQUIRE_OPENAI !== "false";
const forceFallback = process.env.TELEPHONY_TTS_SMOKE_FORCE_FALLBACK === "true";
const ttsEvents: Array<{ provider?: string; status?: string }> = [];

if (shouldSkipWithoutOpenAI && !process.env.OPENAI_API_KEY) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        reason: "OPENAI_API_KEY is not set; skipping live TTS smoke.",
        skipped: true,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeAudio = (audio: AudioChunk) =>
  audio instanceof Uint8Array
    ? audio
    : audio instanceof ArrayBuffer
      ? new Uint8Array(audio)
      : new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength);

const createSmokeSTTAdapter = (): STTAdapter => ({
  kind: "stt",
  open: (_options: STTAdapterOpenOptions): STTAdapterSession => {
    const listeners = {
      close: new Set<(payload: { type: "close" }) => void>(),
      endOfTurn: new Set<
        (payload: {
          reason: "vendor";
          receivedAt: number;
          type: "endOfTurn";
        }) => void
      >(),
      error: new Set<
        (payload: { error: Error; recoverable: boolean; type: "error" }) => void
      >(),
      final: new Set<
        (payload: {
          receivedAt: number;
          transcript: Transcript;
          type: "final";
        }) => void
      >(),
      partial: new Set<
        (payload: {
          receivedAt: number;
          transcript: Transcript;
          type: "partial";
        }) => void
      >(),
    };
    let delivered = false;

    return {
      close: async () => {
        for (const handler of listeners.close) {
          handler({ type: "close" });
        }
      },
      on: (event, handler) => {
        (listeners[event] as Set<typeof handler>).add(handler as never);
        return () => {
          (listeners[event] as Set<typeof handler>).delete(handler as never);
        };
      },
      send: async (audio: AudioChunk) => {
        if (delivered || normalizeAudio(audio).byteLength === 0) {
          return;
        }

        delivered = true;
        const receivedAt = Date.now();
        for (const handler of listeners.final) {
          handler({
            receivedAt,
            transcript: {
              id: "telephony-tts-smoke-final",
              isFinal: true,
              text: "Please confirm this phone audio works.",
            },
            type: "final",
          });
        }
        for (const handler of listeners.endOfTurn) {
          handler({
            reason: "vendor",
            receivedAt,
            type: "endOfTurn",
          });
        }
      },
    };
  },
});

const createEmergencyTTS = (): TTSAdapter => ({
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
        const samples = 4_000;
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

const createOpenAITTSForSmoke = () =>
  createOpenAIVoiceTTS({
    apiKey: process.env.OPENAI_API_KEY ?? "test-key",
    fetch: forceFallback
      ? (((async () =>
          new Response(JSON.stringify({ error: "forced fallback" }), {
            status: 503,
          })) as unknown) as typeof fetch)
      : process.env.OPENAI_API_KEY ||
          process.env.TELEPHONY_TTS_SMOKE_REQUIRE_OPENAI !== "false"
        ? undefined
        : (((async () =>
            new Response(new Uint8Array([0, 0, 32, 0, 224, 255, 0, 0]), {
              headers: {
                "content-type": "audio/pcm",
              },
              status: 200,
            })) as unknown) as typeof fetch),
    instructions:
      "Speak like a concise phone support agent. Keep the response clear.",
    model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
    voice: process.env.OPENAI_TTS_VOICE ?? "marin",
  });

const createBridgeOptions = (): BridgeOptions => ({
  context: {},
  onComplete: async () => {},
  onTurn: async () => ({
    assistantText: "Confirmed. Phone audio is working.",
  }),
  session: createVoiceMemoryStore(),
  stt: createSmokeSTTAdapter(),
  tts: createVoiceTTSProviderRouter<"openai" | "emergency">({
    adapters: {
      emergency: createEmergencyTTS(),
      openai: createOpenAITTSForSmoke(),
    },
    fallback: ["openai", "emergency"],
    onProviderEvent: (event) => {
      ttsEvents.push({
        provider: event.provider,
        status: event.status,
      });
    },
    policy: "ordered",
    providerHealth: {
      cooldownMs: 100,
      failureThreshold: 1,
    },
    selectProvider: () => "openai",
  }),
  turnDetection: {
    transcriptStabilityMs: 0,
  },
});

const payload = encodeTwilioMulawBase64(
  new Int16Array([500, -500, 1_500, -1_500, 2_500, -2_500]),
);

const providers: ProviderSmoke[] = [
  {
    isAudio: (message) => message.event === "media",
    name: "twilio",
    run: async (socket, options) => {
      const bridge = createTwilioMediaStreamBridge(socket, options);
      await bridge.handleMessage({
        event: "start",
        start: {
          callSid: "twilio-smoke-call",
          customParameters: {
            scenarioId: "general",
            sessionId: `tts-smoke-twilio-${Date.now()}`,
          },
          streamSid: "twilio-smoke-stream",
        },
        streamSid: "twilio-smoke-stream",
      });
      await bridge.handleMessage({
        event: "media",
        media: {
          payload,
          track: "inbound",
        },
        streamSid: "twilio-smoke-stream",
      });
      return bridge;
    },
  },
  {
    isAudio: (message) => message.event === "media",
    name: "telnyx",
    run: async (socket, options) => {
      const bridge = createTelnyxMediaStreamBridge(socket, options);
      await bridge.handleMessage({
        event: "start",
        start: {
          call_control_id: "telnyx-smoke-call",
          call_session_id: `tts-smoke-telnyx-${Date.now()}`,
          media_format: {
            channels: 1,
            encoding: "PCMU",
            sample_rate: 8000,
          },
        },
        stream_id: "telnyx-smoke-stream",
      });
      await bridge.handleMessage({
        event: "media",
        media: {
          payload,
          track: "inbound",
        },
        stream_id: "telnyx-smoke-stream",
      });
      return bridge;
    },
  },
  {
    isAudio: (message) => message.event === "playAudio",
    name: "plivo",
    run: async (socket, options) => {
      const bridge = createPlivoMediaStreamBridge(socket, options);
      await bridge.handleMessage({
        event: "start",
        start: {
          callId: "plivo-smoke-call",
          extra_headers: `sessionId=tts-smoke-plivo-${Date.now()};scenarioId=general`,
          streamId: "plivo-smoke-stream",
        },
        streamId: "plivo-smoke-stream",
      });
      await bridge.handleMessage({
        event: "media",
        media: {
          payload,
          track: "inbound",
        },
        streamId: "plivo-smoke-stream",
      });
      return bridge;
    },
  },
];

const runProviderSmoke = async (provider: ProviderSmoke) => {
  const startedAt = Date.now();
  const sentMessages: Record<string, unknown>[] = [];
  const socket: SmokeSocket = {
    close: () => {},
    send: (data) => {
      sentMessages.push(JSON.parse(data) as Record<string, unknown>);
    },
  };
  const bridge = await provider.run(socket, createBridgeOptions());

  try {
    while (Date.now() - startedAt < timeoutMs) {
      const audioMessages = sentMessages.filter(provider.isAudio);
      if (audioMessages.length > 0) {
        return {
          elapsedMs: Date.now() - startedAt,
          messageCount: sentMessages.length,
          ok: true,
          provider: provider.name,
        };
      }
      await sleep(25);
    }

    throw new Error(
      `${provider.name} did not emit outbound carrier audio within ${timeoutMs}ms`,
    );
  } finally {
    await bridge.close("telephony-tts-smoke-complete");
  }
};

const settled = await Promise.allSettled(providers.map(runProviderSmoke));
const results = settled.map((result, index) =>
  result.status === "fulfilled"
    ? result.value
    : {
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        ok: false,
        provider: providers[index]!.name,
      },
);
const ok = results.every((result) => result.ok);
const ttsSummary = ttsEvents.reduce<Record<string, number>>((summary, event) => {
  const key = [event.provider ?? "unknown", event.status ?? "unknown"].join(":");
  summary[key] = (summary[key] ?? 0) + 1;
  return summary;
}, {});

console.log(
  JSON.stringify(
    {
      mode: process.env.OPENAI_API_KEY ? "live-openai" : "mock-openai",
      forcedFallback: forceFallback,
      ok,
      results,
      ttsSummary,
    },
    null,
    2,
  ),
);

if (!ok) {
  process.exit(1);
}
