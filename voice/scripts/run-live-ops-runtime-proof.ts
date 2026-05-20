import { Elysia } from "elysia";
import {
  buildVoiceLiveOpsControlState,
  createVoiceMemoryLiveOpsControlStore,
  createVoiceMemoryStore,
  createVoiceMemoryTraceEventStore,
  voice,
  type STTAdapter,
  type STTSessionEventMap,
  type VoiceServerMessage,
} from "@absolutejs/voice";

const PORT = process.env.VOICE_LIVE_OPS_RUNTIME_PROOF_PORT
  ? Number(process.env.VOICE_LIVE_OPS_RUNTIME_PROOF_PORT)
  : undefined;
const PATH = "/voice/live-ops-runtime-proof";
const SESSION_ID = `live-ops-runtime-proof-${Date.now()}`;
const INJECTED_INSTRUCTION = "Say LIVE OPS PROOF in the next assistant answer.";

type Message = VoiceServerMessage<Record<string, unknown>>;

const fail = (message: string): never => {
  throw new Error(`[live-ops-runtime-proof] ${message}`);
};

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async <T>(
  label: string,
  read: () => T | undefined,
  timeoutMs = 2_000,
) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = read();
    if (value !== undefined) {
      return value;
    }
    await wait(25);
  }

  fail(`Timed out waiting for ${label}.`);
};

const createProofSTTAdapter = (): STTAdapter => ({
  kind: "stt",
  open: () => {
    const listeners = {
      close: new Set<(payload: STTSessionEventMap["close"]) => void | Promise<void>>(),
      endOfTurn: new Set<
        (payload: STTSessionEventMap["endOfTurn"]) => void | Promise<void>
      >(),
      error: new Set<(payload: STTSessionEventMap["error"]) => void | Promise<void>>(),
      final: new Set<(payload: STTSessionEventMap["final"]) => void | Promise<void>>(),
      partial: new Set<
        (payload: STTSessionEventMap["partial"]) => void | Promise<void>
      >(),
    };
    let turnIndex = 0;

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
        turnIndex += 1;
        const receivedAt = Date.now();
        const text =
          turnIndex === 1
            ? "first paused live ops proof turn"
            : "second resumed live ops proof turn";

        const final = {
          receivedAt,
          transcript: {
            confidence: 0.99,
            id: `proof-final-${turnIndex}`,
            isFinal: true,
            text,
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
  const raw = String(event.data);

  try {
    return JSON.parse(raw) as Message;
  } catch {
    return undefined;
  }
};

const createProofApp = (
  liveOps: ReturnType<typeof createVoiceMemoryLiveOpsControlStore>,
  trace: ReturnType<typeof createVoiceMemoryTraceEventStore>,
  onTurn: Parameters<typeof voice>[0]["onTurn"],
) =>
  new Elysia().use(
    voice({
      liveOps: {
        getControl: (sessionId) => liveOps.get(sessionId),
      },
      onComplete: async () => {},
      onTurn,
      path: PATH,
      session: createVoiceMemoryStore(),
      stt: createProofSTTAdapter(),
      trace,
      turnDetection: {
        transcriptStabilityMs: 0,
      },
    }),
  );

const listenProofApp = (
  createApp: () => ReturnType<typeof createProofApp>,
) => {
  const ports = PORT
    ? [PORT]
    : Array.from(
        { length: 30 },
        (_, index) => 32_100 + Math.floor(Math.random() * 1_000) + index,
      );

  let lastError: unknown;

  for (const port of ports) {
    const app = createApp();

    try {
      app.listen(port);
      return { app, port };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to start proof server.");
};

const run = async () => {
  const liveOps = createVoiceMemoryLiveOpsControlStore();
  const trace = createVoiceMemoryTraceEventStore();
  let onTurnCalls = 0;
  let observedInstruction: string | undefined;
  const onProofTurn = async (input: {
    liveOps?: { injectedInstruction?: string };
  }) => {
    onTurnCalls += 1;
    observedInstruction = input.liveOps?.injectedInstruction;

    return {
      assistantText: `Instruction observed: ${
        input.liveOps?.injectedInstruction ?? "none"
      }`,
    };
  };

  const { app, port } = listenProofApp(() =>
    createProofApp(liveOps, trace, onProofTurn),
  );

  try {
    const pausedControl = buildVoiceLiveOpsControlState({
      action: "pause-assistant",
      assignee: "proof-operator",
      detail: "Pause assistant for runtime proof.",
      sessionId: SESSION_ID,
      tag: "proof",
    });
    await liveOps.set(SESSION_ID, pausedControl);

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

    await waitFor("paused turn commit", () =>
      messages.find(
        (message) =>
          message.type === "turn" &&
          message.turn.transcripts.some((transcript) =>
            transcript.text.includes("first paused"),
          ),
      ),
    );
    await wait(250);

    const pausedAssistant = messages.find(
      (message) => message.type === "assistant",
    );
    if (pausedAssistant) {
      fail("Paused turn generated an assistant response.");
    }
    if (onTurnCalls !== 0) {
      fail(`Paused turn called onTurn ${onTurnCalls} time(s).`);
    }

    const injectedControl = buildVoiceLiveOpsControlState({
      action: "inject-instruction",
      assignee: "proof-operator",
      detail: INJECTED_INSTRUCTION,
      previous: pausedControl,
      sessionId: SESSION_ID,
      tag: "proof",
    });
    const resumedControl = buildVoiceLiveOpsControlState({
      action: "resume-assistant",
      assignee: "proof-operator",
      detail: "Resume assistant for runtime proof.",
      previous: injectedControl,
      sessionId: SESSION_ID,
      tag: "proof",
    });
    await liveOps.set(SESSION_ID, resumedControl);

    socket.send(new Uint8Array([5, 6, 7, 8]));
    await wait(25);
    socket.send(JSON.stringify({ type: "end_turn" }));

    await waitFor("resumed assistant response", () =>
      messages.find(
        (message) =>
          message.type === "assistant" &&
          message.text.includes("LIVE OPS PROOF"),
      ),
    );

    if (onTurnCalls !== 1) {
      fail(`Expected exactly one resumed onTurn call, received ${onTurnCalls}.`);
    }
    if (observedInstruction !== INJECTED_INSTRUCTION) {
      fail("Injected instruction was not passed into onTurn.");
    }

    const traces = await trace.list({ sessionId: SESSION_ID });
    const skippedTrace = traces.find(
      (event) =>
        event.type === "operator.action" &&
        event.payload.action === "turn.skipped",
    );
    if (!skippedTrace) {
      fail("Missing operator.action turn.skipped trace for paused turn.");
    }

    socket.close();
    await wait(50);

    console.log(
      JSON.stringify(
        {
          ok: true,
          pausedAssistantResponses: 0,
          resumedAssistantResponses: messages.filter(
            (message) => message.type === "assistant",
          ).length,
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
