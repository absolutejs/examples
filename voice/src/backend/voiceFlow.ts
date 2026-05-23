import type {
  VoiceCallDisposition,
  VoicePhraseHint,
  VoiceRouteResult,
  VoiceSessionRecord,
  VoiceTurnRecord,
} from "@absolutejs/voice";
import { VOICE_TEST_QUESTIONS } from "../constants/demoCopy";
import type { SavedIntake } from "../types/domain";
import type { VoiceDemoMode, VoiceScenarioId } from "../types/voice";

const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

const extractName = (text: string) => {
  const normalized = cleanText(text);
  const match = normalized.match(
    /(?:my name is|i am|i'm|this is)\s+([a-z][a-z'-]+(?:\s+[a-z][a-z'-]+)?)/i,
  );

  if (!match?.[1]) {
    return undefined;
  }

  return match[1]
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const buildTranscript = (turns: string[]) => cleanText(turns.join(" "));

const clipWords = (value: string, maxWords: number) => {
  const words = cleanText(value).split(" ").filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  const clipped = words.slice(0, maxWords).join(" ");

  return words.length > maxWords ? `${clipped}...` : clipped;
};

const formatDisposition = (disposition: VoiceCallDisposition | undefined) => {
  switch (disposition) {
    case "transferred":
      return "Transferred";
    case "escalated":
      return "Escalated";
    case "voicemail":
      return "Voicemail";
    case "no-answer":
      return "No answer";
    case "failed":
      return "Failed";
    case "closed":
      return "Closed";
    case "completed":
      return "Completed";
    default:
      return undefined;
  }
};

const buildTitle = (input: {
  detectedName?: string;
  scenarioId: VoiceScenarioId;
  promptAnswers: Array<{
    prompt: string;
    response: string;
  }>;
  transcript: string;
  disposition?: VoiceCallDisposition;
}) => {
  const source =
    input.promptAnswers[1]?.response ||
    input.promptAnswers[0]?.response ||
    input.transcript;
  const summary = clipWords(source, 8);
  const dispositionLabel = formatDisposition(input.disposition);

  if (!summary) {
    if (input.detectedName) {
      const base =
        input.scenarioId === "guided"
          ? `${input.detectedName}'s guided test`
          : `${input.detectedName}'s recording`;

      return dispositionLabel ? `${base} (${dispositionLabel})` : base;
    }

    const base =
      input.scenarioId === "guided" ? "Guided voice test" : "General recording";

    return dispositionLabel ? `${base} (${dispositionLabel})` : base;
  }

  const titled = input.detectedName
    ? `${input.detectedName}: ${summary}`
    : summary;

  return dispositionLabel ? `${titled} (${dispositionLabel})` : titled;
};

export const resolveScenarioFromContext = (context: unknown): VoiceDemoMode => {
  if (
    context &&
    typeof context === "object" &&
    "query" in context &&
    context.query &&
    typeof context.query === "object" &&
    (("mode" in context.query && context.query.mode === "general") ||
      ("scenarioId" in context.query && context.query.scenarioId === "general"))
  ) {
    return "general";
  }

  return "guided";
};

const countWords = (value: string) =>
  cleanText(value).split(" ").filter(Boolean).length;

const getLatestLifecycleEvent = (session: VoiceSessionRecord) =>
  [...(session.call?.events ?? [])]
    .reverse()
    .find((event) => event.type !== "start");

const detectLifecycleIntent = (text: string) => {
  const normalized = cleanText(text).toLowerCase();

  if (
    /\b(transfer|route|send)\b/.test(normalized) &&
    /\b(billing|sales|support|human|agent)\b/.test(normalized)
  ) {
    const target = normalized.includes("billing")
      ? "billing"
      : normalized.includes("sales")
        ? "sales"
        : normalized.includes("support")
          ? "support"
          : "human-agent";

    return {
      assistantText: `Transferring this call to ${target}.`,
      target,
      type: "transfer" as const,
    };
  }

  if (
    /\b(escalate|escalation|manager|supervisor|human)\b/.test(normalized) &&
    /\b(issue|problem|review|help|please|need)\b/.test(normalized)
  ) {
    return {
      assistantText: "Escalating this call for human follow-up.",
      reason: "caller-requested-escalation",
      type: "escalate" as const,
    };
  }

  if (/\b(voicemail|voice mail|leave a message)\b/.test(normalized)) {
    return {
      assistantText: "Marking this call as voicemail.",
      type: "voicemail" as const,
    };
  }

  if (
    /\b(no answer|nobody answered|no one answered|could not reach)\b/.test(
      normalized,
    )
  ) {
    return {
      assistantText: "Marking this call as no answer.",
      type: "no-answer" as const,
    };
  }

  return null;
};

export const VOICE_DEMO_PHRASE_HINTS: VoicePhraseHint[] = [
  { aliases: ["absolute js"], text: "AbsoluteJS" },
  { aliases: ["deep gram"], text: "Deepgram" },
  { aliases: ["elisia"], text: "Elysia" },
  { aliases: ["html x", "h t m x"], text: "HTMX" },
  { aliases: ["view"], text: "Vue" },
  { aliases: ["svelt"], text: "Svelte" },
  { aliases: ["voice in take"], text: "voice intake" },
  { aliases: ["guide test"], text: "guided test" },
  { aliases: ["general recordin"], text: "general recording" },
  { aliases: ["bill ing"], text: "billing" },
  { aliases: ["supp ort"], text: "support" },
  { text: "sales" },
  { aliases: ["human", "agent"], text: "human agent" },
  { aliases: ["voice mail"], text: "voicemail" },
  { aliases: ["no one answered"], text: "no answer" },
  { aliases: ["escalate"], text: "escalation" },
];

export const buildSavedIntake = <
  TSession extends VoiceSessionRecord = VoiceSessionRecord,
>(
  session: TSession,
  mode: VoiceDemoMode = "guided",
): SavedIntake => {
  const turns = session.turns
    .map((turn) => cleanText(turn.text))
    .filter(Boolean);
  const transcript = buildTranscript(turns);
  const detectedName = extractName(turns[0] ?? "");
  const wordCount = countWords(transcript);
  const disposition = session.call?.disposition;
  const latestLifecycleEvent = getLatestLifecycleEvent(session);
  const callTarget = latestLifecycleEvent?.target;
  const callReason = latestLifecycleEvent?.reason;
  const promptAnswers = turns.map((response, index) => ({
    prompt:
      mode === "guided"
        ? (VOICE_TEST_QUESTIONS[index] ??
          `Additional detail ${index - VOICE_TEST_QUESTIONS.length + 1}`)
        : index === 0
          ? "General recording"
          : `Additional recording ${index + 1}`,
    response,
  }));
  const dispositionLabel = formatDisposition(disposition);

  return {
    assistantSummary: dispositionLabel
      ? `${dispositionLabel}${callTarget ? ` to ${callTarget}` : ""}${callReason ? ` (${callReason})` : ""} after ${turns.length} turn${turns.length === 1 ? "" : "s"}, totaling ${wordCount} words.`
      : detectedName
        ? mode === "guided"
          ? `${detectedName} answered ${promptAnswers.length} prompt${promptAnswers.length === 1 ? "" : "s"} across ${turns.length} turn${turns.length === 1 ? "" : "s"}, totaling ${wordCount} words.`
          : `${detectedName} recorded ${turns.length} turn${turns.length === 1 ? "" : "s"}, totaling ${wordCount} words.`
        : mode === "guided"
          ? `Answered ${promptAnswers.length} prompt${promptAnswers.length === 1 ? "" : "s"} across ${turns.length} turn${turns.length === 1 ? "" : "s"}, totaling ${wordCount} words.`
          : `Recorded ${turns.length} turn${turns.length === 1 ? "" : "s"}, totaling ${wordCount} words.`,
    callDisposition: disposition,
    callReason,
    callTarget,
    completedAt: Date.now(),
    detectedName,
    id: session.id,
    scenarioId: mode,
    mode,
    promptAnswers,
    sessionId: session.id,
    title: buildTitle({
      detectedName,
      disposition,
      promptAnswers,
      scenarioId: mode,
      transcript,
    }),
    transcript: transcript || "No transcript captured",
    turnCount: turns.length,
    turns,
  };
};

export const decideIntakeTurn = <
  TSession extends VoiceSessionRecord = VoiceSessionRecord,
>(
  session: TSession,
  turn: VoiceTurnRecord,
  _api?: unknown,
  context?: unknown,
): VoiceRouteResult<SavedIntake> => {
  const mode = resolveScenarioFromContext(context);
  const lifecycleIntent = detectLifecycleIntent(turn.text);

  if (lifecycleIntent) {
    const result = buildSavedIntake(session, mode);

    switch (lifecycleIntent.type) {
      case "transfer":
        return {
          assistantText: lifecycleIntent.assistantText,
          result,
          transfer: {
            reason: "caller-requested-transfer",
            target: lifecycleIntent.target,
          },
        };
      case "escalate":
        return {
          assistantText: lifecycleIntent.assistantText,
          escalate: {
            reason: lifecycleIntent.reason,
          },
          result,
        };
      case "voicemail":
        return {
          assistantText: lifecycleIntent.assistantText,
          result,
          voicemail: {},
        };
      case "no-answer":
        return {
          assistantText: lifecycleIntent.assistantText,
          noAnswer: {},
          result,
        };
    }
  }

  if (mode === "general") {
    const result = buildSavedIntake(session, mode);

    return {
      assistantText: "Received.",
      complete: true,
      result,
    };
  }

  const turnCount = session.turns.length;
  const nextQuestion = VOICE_TEST_QUESTIONS[turnCount];

  if (nextQuestion) {
    return {
      assistantText: `Captured that. Next question: ${nextQuestion}`,
    };
  }

  const result = buildSavedIntake(session, mode);

  return {
    assistantText: result.detectedName
      ? `Thanks ${result.detectedName}. Your voice test is saved.`
      : "Your voice test is saved.",
    complete: true,
    result,
  };
};
