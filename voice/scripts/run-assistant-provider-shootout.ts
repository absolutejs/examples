import {
  createAnthropicVoiceAssistantModel,
  createGeminiVoiceAssistantModel,
  createJSONVoiceAssistantModel,
  createOpenAIVoiceAssistantModel,
  createVoiceAgent,
  createVoiceAgentTool,
  createVoiceSessionRecord,
  type VoiceAgentModel,
  type VoiceSessionRecord,
  type VoiceTurnRecord,
} from "@absolutejs/voice";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  decideIntakeTurn,
  resolveScenarioFromContext,
} from "../src/backend/voiceFlow";
import type { SavedIntake } from "../src/shared/demo";

type ProviderId = "deterministic" | "openai" | "anthropic" | "gemini";

type ShootoutCase = {
  expected: {
    complete?: boolean;
    hasAssistantText?: boolean;
    toolCallName?: string;
    outcome?:
      | "completed"
      | "escalated"
      | "transferred"
      | "voicemail"
      | "no-answer";
  };
  id: string;
  scenarioId: "guided" | "general";
  text: string;
};

type ShootoutResult = {
  assistantText?: string;
  complete?: boolean;
  elapsedMs: number;
  error?: string;
  expected: ShootoutCase["expected"];
  id: string;
  jsonValid: boolean;
  ok: boolean;
  outcome?: string;
  provider: ProviderId;
  toolCalls: string[];
};

const cases: ShootoutCase[] = [
  {
    expected: {
      hasAssistantText: true,
    },
    id: "guided-intro",
    scenarioId: "guided",
    text: "My name is Alex and I am testing a meeting recorder for support calls.",
  },
  {
    expected: {
      complete: true,
      outcome: "completed",
    },
    id: "general-complete",
    scenarioId: "general",
    text: "Capture this general recording about a buyer asking for AbsoluteJS voice integrations.",
  },
  {
    expected: {
      outcome: "transferred",
      toolCallName: "lifecycle_router",
    },
    id: "transfer-billing",
    scenarioId: "guided",
    text: "Please transfer me to billing because I need help with an invoice.",
  },
  {
    expected: {
      outcome: "escalated",
      toolCallName: "lifecycle_router",
    },
    id: "human-escalation",
    scenarioId: "guided",
    text: "I need to speak to a human supervisor about this support issue.",
  },
];

const configuredProviders: ProviderId[] = [
  "deterministic",
  process.env.OPENAI_API_KEY ? "openai" : undefined,
  process.env.ANTHROPIC_API_KEY ? "anthropic" : undefined,
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    ? "gemini"
    : undefined,
].filter(Boolean) as ProviderId[];

const parseProviderFilter = () => {
  const raw = process.env.VOICE_SHOOTOUT_PROVIDERS;
  if (!raw) {
    return configuredProviders;
  }

  const requested = raw
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean) as ProviderId[];

  return requested.filter((provider) => configuredProviders.includes(provider));
};

const createTurn = (text: string): VoiceTurnRecord => ({
  committedAt: Date.now(),
  id: crypto.randomUUID(),
  text,
  transcripts: [],
});

const createRunInput = (testCase: ShootoutCase) => {
  const session = createVoiceSessionRecord(
    `shootout-${testCase.id}-${crypto.randomUUID()}`,
    testCase.scenarioId,
  );
  const turn = createTurn(testCase.text);
  session.turns.push(turn);

  return {
    context: {
      query: {
        scenarioId: testCase.scenarioId,
      },
    },
    session,
    turn,
  };
};

const createTools = () => [
  createVoiceAgentTool<
    unknown,
    VoiceSessionRecord,
    Record<string, unknown>,
    unknown,
    SavedIntake
  >({
    description:
      "Classify whether the caller is in guided or general intake mode. Use this when the user starts a new intake and you need to know the scenario.",
    execute: ({ context }) => ({
      mode: resolveScenarioFromContext(context),
    }),
    name: "intake_classifier",
    parameters: {
      properties: {},
      type: "object",
    },
  }),
  createVoiceAgentTool<
    unknown,
    VoiceSessionRecord,
    Record<string, unknown>,
    unknown,
    SavedIntake
  >({
    description:
      "Route transfer, escalation, voicemail, and no-answer phrases into call outcomes. Use this before returning transfer, escalate, voicemail, or noAnswer JSON.",
    execute: ({ args }) => {
      const rawText = typeof args.text === "string" ? args.text : "";
      const text = rawText.toLowerCase();

      if (text.includes("transfer") && text.includes("billing")) {
        return {
          assistantText: "Transferring this call to billing.",
          outcome: "transferred",
          transfer: {
            reason: "caller-requested-transfer",
            target: "billing",
          },
        };
      }

      if (
        text.includes("human") ||
        text.includes("supervisor") ||
        text.includes("manager")
      ) {
        return {
          assistantText: "Escalating this call for human follow-up.",
          escalate: {
            reason: "caller-requested-escalation",
          },
          outcome: "escalated",
        };
      }

      if (text.includes("voicemail") || text.includes("voice mail")) {
        return {
          assistantText: "Marking this call as voicemail.",
          outcome: "voicemail",
          voicemail: {},
        };
      }

      if (text.includes("no answer")) {
        return {
          assistantText: "Marking this call as no answer.",
          noAnswer: {},
          outcome: "no-answer",
        };
      }

      return {
        outcome: "none",
        text: rawText,
      };
    },
    name: "lifecycle_router",
    parameters: {
      properties: {
        text: {
          type: "string",
        },
      },
      required: ["text"],
      type: "object",
    },
  }),
];

const createAgent = (
  provider: ProviderId,
): ReturnType<
  typeof createVoiceAgent<unknown, VoiceSessionRecord, SavedIntake>
> =>
  createVoiceAgent<unknown, VoiceSessionRecord, SavedIntake>({
    id: "support",
    maxToolRounds: 2,
    model: createModel(provider),
    system:
      "You are the AbsoluteJS support voice assistant. Use tools when they help classify mode or route lifecycle outcomes. After a tool result, return only JSON matching the route result shape. If intake_classifier returns general, capture the current freeform turn and return complete true. If mode is guided, ask the next concise guided question unless all guided prompts are complete. For lifecycle tool results, mirror the tool outcome into transfer, escalate, voicemail, or noAnswer.",
    tools: createTools(),
  });

const createModel = (
  provider: ProviderId,
): VoiceAgentModel<unknown, VoiceSessionRecord, SavedIntake> => {
  switch (provider) {
    case "openai":
      return createOpenAIVoiceAssistantModel({
        apiKey: process.env.OPENAI_API_KEY ?? "",
        model: process.env.OPENAI_VOICE_MODEL ?? "gpt-4.1-mini",
      });
    case "anthropic":
      return createAnthropicVoiceAssistantModel({
        apiKey: process.env.ANTHROPIC_API_KEY ?? "",
        model: process.env.ANTHROPIC_VOICE_MODEL ?? "claude-sonnet-4-5",
      });
    case "gemini":
      return createGeminiVoiceAssistantModel({
        apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
        model: process.env.GEMINI_VOICE_MODEL ?? "gemini-2.5-flash",
      });
    case "deterministic":
      return deterministicModel;
  }
};

const deterministicModel = createJSONVoiceAssistantModel<
  unknown,
  VoiceSessionRecord,
  SavedIntake
>({
  generate: ({ context, session, turn }) =>
    decideIntakeTurn(session, turn, undefined, context),
});

const resolveOutcome = (output: {
  complete?: boolean;
  escalate?: unknown;
  noAnswer?: unknown;
  result?: SavedIntake;
  transfer?: unknown;
  voicemail?: unknown;
}) => {
  if (output.transfer) {
    return "transferred";
  }
  if (output.escalate) {
    return "escalated";
  }
  if (output.voicemail) {
    return "voicemail";
  }
  if (output.noAnswer) {
    return "no-answer";
  }
  if (output.complete) {
    return "completed";
  }
  return output.result?.callDisposition;
};

const scoreResult = (
  testCase: ShootoutCase,
  output: {
    assistantText?: string;
    complete?: boolean;
    escalate?: unknown;
    noAnswer?: unknown;
    result?: SavedIntake;
    toolResults?: Array<{ toolName: string }>;
    transfer?: unknown;
    voicemail?: unknown;
  },
) => {
  const toolCalls =
    output.toolResults?.map((toolResult) => toolResult.toolName) ?? [];
  const outcome = resolveOutcome(output);
  const expected = testCase.expected;
  const outcomeOk = expected.outcome ? outcome === expected.outcome : true;
  const completeOk =
    expected.complete === undefined
      ? true
      : output.complete === expected.complete;
  const assistantTextOk = expected.hasAssistantText
    ? Boolean(output.assistantText?.trim())
    : true;
  const toolOk = expected.toolCallName
    ? toolCalls.includes(expected.toolCallName) || Boolean(outcome)
    : true;

  return {
    ok: outcomeOk && completeOk && assistantTextOk && toolOk,
    outcome,
    toolCalls,
  };
};

const runOne = async (
  provider: ProviderId,
  testCase: ShootoutCase,
): Promise<ShootoutResult> => {
  const startedAt = performance.now();

  try {
    const output = await createAgent(provider).run({
      ...createRunInput(testCase),
      api: {} as never,
    });
    const elapsedMs = Math.round(performance.now() - startedAt);
    const scored = scoreResult(testCase, output);

    return {
      assistantText: output.assistantText,
      complete: output.complete,
      elapsedMs,
      expected: testCase.expected,
      id: testCase.id,
      jsonValid: true,
      ok: scored.ok,
      outcome: scored.outcome,
      provider,
      toolCalls: scored.toolCalls,
    };
  } catch (error) {
    return {
      elapsedMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
      expected: testCase.expected,
      id: testCase.id,
      jsonValid: false,
      ok: false,
      provider,
      toolCalls: [],
    };
  }
};

const runProvider = async (provider: ProviderId) => {
  const results: ShootoutResult[] = [];
  for (const testCase of cases) {
    results.push(await runOne(provider, testCase));
  }
  return results;
};

const summarize = (results: ShootoutResult[]) =>
  Object.values(
    results.reduce<
      Record<
        string,
        {
          averageElapsedMs: number;
          jsonValid: number;
          ok: number;
          provider: ProviderId;
          total: number;
        }
      >
    >((summary, result) => {
      const current = summary[result.provider] ?? {
        averageElapsedMs: 0,
        jsonValid: 0,
        ok: 0,
        provider: result.provider,
        total: 0,
      };

      current.averageElapsedMs += result.elapsedMs;
      current.jsonValid += result.jsonValid ? 1 : 0;
      current.ok += result.ok ? 1 : 0;
      current.total += 1;
      summary[result.provider] = current;
      return summary;
    }, {}),
  ).map((entry) => ({
    ...entry,
    averageElapsedMs: Math.round(entry.averageElapsedMs / entry.total),
  }));

const providers = parseProviderFilter();

if (providers.length === 0) {
  throw new Error(
    "No providers configured. Add an API key or set VOICE_SHOOTOUT_PROVIDERS=deterministic.",
  );
}

const results = (
  await Promise.all(providers.map((provider) => runProvider(provider)))
)
  .flat()
  .sort((left, right) =>
    left.provider === right.provider
      ? left.id.localeCompare(right.id)
      : left.provider.localeCompare(right.provider),
  );

const output = {
  generatedAt: new Date().toISOString(),
  providerEnv: {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
  },
  results,
  summary: summarize(results),
};

const outputDirectory = resolve(
  process.env.VOICE_SHOOTOUT_OUTPUT_DIR ?? ".voice-runtime/shootouts",
);
await mkdir(outputDirectory, {
  recursive: true,
});
const outputPath = resolve(
  outputDirectory,
  `assistant-provider-shootout-${Date.now()}.json`,
);
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.table(output.summary);
console.log(`Wrote ${outputPath}`);
