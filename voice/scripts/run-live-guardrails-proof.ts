import { Elysia } from "elysia";
import {
  createVoiceAgentTool,
  createVoiceAssistant,
  createVoiceGuardrailPolicy,
  createVoiceGuardrailRuntime,
  createVoiceMemoryStore,
  createVoiceMemoryTraceEventStore,
  voice,
  voiceGuardrailPolicyPresets,
  type STTAdapter,
  type STTSessionEventMap,
  type VoiceAgentModel,
  type VoiceServerMessage,
  type VoiceSessionRecord,
  type StoredVoiceTraceEvent,
} from "@absolutejs/voice";

const PORT = process.env.VOICE_LIVE_GUARDRAILS_PROOF_PORT
  ? Number(process.env.VOICE_LIVE_GUARDRAILS_PROOF_PORT)
  : undefined;
const PATH = "/voice/live-guardrails-proof";
const SESSION_ID = `live-guardrails-proof-${Date.now()}`;
const BLOCKED_TOOL_ARG = "blocked_tool_arg";
const BLOCKED_ASSISTANT_TEXT =
  "This is medical advice and I can diagnose the issue.";
const SAFE_BLOCK_TEXT = "I need to route this to a human specialist.";

type Message = VoiceServerMessage<Record<string, unknown>>;
type AssistantMessage = Extract<Message, { type: "assistant" }>;

const fail = (message: string): never => {
  throw new Error(`[live-guardrails-proof] ${message}`);
};

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async <T>(
  label: string,
  read: () => Promise<T | undefined> | T | undefined,
  timeoutMs = 2_500,
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await read();
    if (value !== undefined) {
      return value;
    }
    await wait(25);
  }

  return fail(`Timed out waiting for ${label}.`);
};

const createProofSTTAdapter = (): STTAdapter => ({
  kind: "stt",
  open: () => {
    const listeners = {
      close: new Set<
        (payload: STTSessionEventMap["close"]) => void | Promise<void>
      >(),
      endOfTurn: new Set<
        (payload: STTSessionEventMap["endOfTurn"]) => void | Promise<void>
      >(),
      error: new Set<
        (payload: STTSessionEventMap["error"]) => void | Promise<void>
      >(),
      final: new Set<
        (payload: STTSessionEventMap["final"]) => void | Promise<void>
      >(),
      partial: new Set<
        (payload: STTSessionEventMap["partial"]) => void | Promise<void>
      >(),
    };

    return {
      close: async (reason?: string) => {
        const payload = {
          code: 1000,
          reason,
          recoverable: false,
          type: "close" as const,
        };
        await Promise.all([...listeners.close].map((handler) => handler(payload)));
      },
      on: (event, handler) => {
        listeners[event].add(handler as never);
        return () => {
          listeners[event].delete(handler as never);
        };
      },
      send: async () => {
        const receivedAt = Date.now();
        const final = {
          receivedAt,
          transcript: {
            confidence: 0.99,
            id: "live-guardrails-final",
            isFinal: true,
            text: "run live guardrails proof",
            vendor: "absolutejs-proof",
          },
          type: "final" as const,
        };

        await Promise.all([...listeners.final].map((handler) => handler(final)));
      },
    };
  },
});

const parseMessage = (event: MessageEvent): Message | undefined => {
  try {
    return JSON.parse(String(event.data)) as Message;
  } catch {
    return undefined;
  }
};

const isAssistantMessage = (message: Message): message is AssistantMessage =>
  message.type === "assistant";

const createProofApp = () => {
  const trace = createVoiceMemoryTraceEventStore();
  const toolInputPolicy = createVoiceGuardrailPolicy({
    id: "live-tool-input-proof",
    rules: [
      {
        id: "blocked-tool-argument",
        match: BLOCKED_TOOL_ARG,
        stages: ["tool-input"],
      },
    ],
  });
  const guardrails = createVoiceGuardrailRuntime<
    unknown,
    VoiceSessionRecord,
    Record<string, unknown>
  >({
    blockResult: ({ decision }) => ({
      assistantText: SAFE_BLOCK_TEXT,
      escalate: {
        metadata: {
          guardrail: true,
          stage: decision.stage,
        },
        reason: `guardrail-blocked-${decision.stage}`,
      },
      result: {
        blockedStage: decision.stage,
      },
    }),
    name: "live-guardrails-proof",
    policies: [toolInputPolicy, voiceGuardrailPolicyPresets.supportSafeDefaults],
    trace,
  });
  const dangerousLookupTool = guardrails.wrapTool(
    createVoiceAgentTool<
      unknown,
      VoiceSessionRecord,
      Record<string, unknown>,
      unknown,
      Record<string, unknown>
    >({
      execute: () => ({
        ok: true,
      }),
      name: "dangerous_lookup",
    }),
  );
  const model: VoiceAgentModel<
    unknown,
    VoiceSessionRecord,
    Record<string, unknown>
  > = {
    generate: ({ messages }) =>
      messages.some((message) => message.role === "tool")
        ? {
            assistantText: BLOCKED_ASSISTANT_TEXT,
          }
        : {
            toolCalls: [
              {
                args: {
                  query: BLOCKED_TOOL_ARG,
                },
                id: "blocked-tool-call",
                name: dangerousLookupTool.name,
              },
            ],
          },
  };
  const assistant = createVoiceAssistant({
    guardrails: guardrails.assistantGuardrails,
    id: "live-guardrails-proof",
    maxToolRounds: 2,
    model,
    tools: [dangerousLookupTool],
    trace,
  });
  const app = new Elysia().use(
    voice({
      onComplete: async () => {},
      onTurn: assistant.onTurn,
      path: PATH,
      session: createVoiceMemoryStore(),
      stt: createProofSTTAdapter(),
      trace,
      turnDetection: {
        transcriptStabilityMs: 0,
      },
    }),
  );

  return { app, trace };
};

const listenProofApp = (createApp: () => ReturnType<typeof createProofApp>) => {
  const ports = PORT
    ? [PORT]
    : Array.from(
        { length: 30 },
        (_, index) => 33_100 + Math.floor(Math.random() * 1_000) + index,
      );

  let lastError: unknown;

  for (const port of ports) {
    const proof = createApp();

    try {
      proof.app.listen(port);
      return { ...proof, port };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to start proof server.");
};

const run = async () => {
  const { app, port, trace } = listenProofApp(createProofApp);

  try {
    const messages: Message[] = [];
    const socket = new WebSocket(
      `ws://127.0.0.1:${port}${PATH}?sessionId=${SESSION_ID}`,
    );

    socket.addEventListener("message", (event) => {
      const message = parseMessage(event);
      if (message) {
        messages.push(message);
      }
    });

    await waitFor("websocket open", () =>
      socket.readyState === WebSocket.OPEN ? true : undefined,
    );

    socket.send(new Uint8Array([1, 2, 3, 4]));
    await wait(25);
    socket.send(JSON.stringify({ type: "end_turn" }));

    const assistantMessage = await waitFor<AssistantMessage>(
      "guardrail block response",
      () =>
        messages
          .filter(isAssistantMessage)
          .find((message) => message.text === SAFE_BLOCK_TEXT),
    );
    const assistantText = assistantMessage.text;
    if (assistantText.includes("medical advice")) {
      fail("Unsafe assistant text reached the client.");
    }

    const traces = await waitFor<StoredVoiceTraceEvent[]>(
      "guardrail traces",
      async () => {
        const events = await trace.list({ sessionId: SESSION_ID });
        return events.filter((event) => event.type === "assistant.guardrail")
          .length >= 4
          ? events
          : undefined;
      },
    );
    const guardrailEvents = traces.filter(
      (event) => event.type === "assistant.guardrail",
    );
    const blockedToolInput = guardrailEvents.find(
      (event) =>
        event.payload.stage === "tool-input" &&
        event.payload.status === "blocked",
    );
    const blockedAssistantOutput = guardrailEvents.find(
      (event) =>
        event.payload.stage === "assistant-output" &&
        event.payload.status === "blocked",
    );
    const assistantRunBlocked = traces.find(
      (event) =>
        event.type === "assistant.run" &&
        event.payload.blocked === false &&
        event.payload.outcome === "escalated",
    );

    if (!blockedToolInput) {
      fail("Missing blocked tool-input guardrail trace.");
    }
    if (!blockedAssistantOutput) {
      fail("Missing blocked assistant-output guardrail trace.");
    }
    if (!assistantRunBlocked) {
      fail("Missing assistant.run escalated outcome trace.");
    }

    socket.close();
    await wait(50);

    console.log(
      JSON.stringify(
        {
          assistantText,
          blockedStages: guardrailEvents
            .filter((event) => event.payload.status === "blocked")
            .map((event) => event.payload.stage),
          guardrailEvents: guardrailEvents.length,
          ok: true,
          sessionId: SESSION_ID,
          traceEvents: traces.length,
        },
        null,
        2,
      ),
    );
  } finally {
    app.server?.stop(true);
  }
};

try {
  await run();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
