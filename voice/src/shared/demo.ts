import {
  VOICE_MODEL_PROVIDERS,
  VOICE_PROFILES,
  VOICE_ROUTING_MODES,
  VOICE_SPEECH_ENGINES,
} from "../constants/voiceOptions";
import {
  VOICE_REALTIME_ROUTE_PATH,
  VOICE_ROUTE_PATH,
} from "../constants/voiceRoutes";
import { VOICE_TEST_QUESTIONS } from "../constants/demoCopy";
import type { VoiceProfileSwitchGuardClientDecision } from "../types/domain";
import type {
  VoiceDemoMode,
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceScenarioId,
  VoiceSpeechEngine,
} from "../types/voice";

export const getVoiceProfileLabel = (profileId?: string) =>
  VOICE_PROFILES.find((item) => item.id === profileId)?.label ??
  profileId ??
  "Unknown";
export const getVoiceProviderLabel = (provider: VoiceModelProvider) =>
  VOICE_MODEL_PROVIDERS.find((item) => item.id === provider)?.label ?? provider;
export const getVoiceRoutePath = (
  scenarioId: VoiceScenarioId,
  provider?: VoiceModelProvider,
  routing?: VoiceRoutingMode,
  engine: VoiceSpeechEngine = "cascaded",
  profileId?: VoiceProfileId,
  sessionId?: string,
) => {
  const params = new URLSearchParams({
    scenarioId,
  });

  if (provider) {
    params.set("provider", provider);
  }
  if (routing) {
    params.set("routing", routing);
  }
  if (profileId) {
    params.set("voiceProfile", profileId);
  }
  // A stable per-stream session id binds every audio frame to one session.
  // Without it the server resolves a fresh session id per frame (a race in its
  // socket-session map), spawning hundreds of sessions per turn and starving STT.
  if (sessionId) {
    params.set("sessionId", sessionId);
  }

  const path =
    engine === "openai-realtime" ? VOICE_REALTIME_ROUTE_PATH : VOICE_ROUTE_PATH;

  return `${path}?${params.toString()}`;
};
export const getVoiceRoutingLabel = (routing?: string) =>
  VOICE_ROUTING_MODES.find((item) => item.id === routing)?.label ??
  routing ??
  "Unknown";
export const isVoiceModelProvider = (
  value: unknown,
): value is VoiceModelProvider =>
  value === "deterministic" ||
  value === "openai" ||
  value === "anthropic" ||
  value === "gemini";
export const isVoiceProfileId = (value: unknown): value is VoiceProfileId =>
  value === "meeting-recorder" ||
  value === "support-agent" ||
  value === "appointment-scheduler" ||
  value === "noisy-phone-call";
export const isVoiceRoutingMode = (value: unknown): value is VoiceRoutingMode =>
  value === "balanced" ||
  value === "fastest" ||
  value === "cheapest" ||
  value === "quality";
export const isVoiceSpeechEngine = (
  value: unknown,
): value is VoiceSpeechEngine =>
  value === "cascaded" || value === "openai-realtime";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined =>
  typeof record[key] === "string" ? record[key] : undefined;

const readNumber = (
  record: Record<string, unknown>,
  key: string,
): number | undefined =>
  typeof record[key] === "number" && Number.isFinite(record[key])
    ? record[key]
    : undefined;

export const formatVoiceProfileSwitchGuardLabel = (
  decision: VoiceProfileSwitchGuardClientDecision | null,
) => getVoiceProfileLabel(decision?.selectedProfileId);
export const formatVoiceProfileSwitchGuardSummary = (
  decision: VoiceProfileSwitchGuardClientDecision | null,
) => {
  if (!decision) {
    return "Waiting for session guard";
  }

  const action = decision.action ?? "evaluated";
  const confidence =
    typeof decision.confidence === "number"
      ? ` at ${Math.round(decision.confidence * 100)}%`
      : "";
  const recommended =
    decision.recommendedProfileId &&
    decision.recommendedProfileId !== decision.selectedProfileId
      ? `, recommended ${getVoiceProfileLabel(decision.recommendedProfileId)}`
      : "";

  return `${action}${confidence}${recommended}`;
};
export const getInitialVoiceModelProvider = (): VoiceModelProvider => {
  if (typeof window === "undefined") {
    return "deterministic";
  }

  const urlProvider = new URLSearchParams(window.location.search).get(
    "provider",
  );
  if (isVoiceModelProvider(urlProvider)) {
    return urlProvider;
  }

  const storedProvider = window.localStorage.getItem("voiceModelProvider");

  return isVoiceModelProvider(storedProvider)
    ? storedProvider
    : "deterministic";
};
export const getInitialVoiceProfileId = (): VoiceProfileId => {
  if (typeof window === "undefined") {
    return "meeting-recorder";
  }

  const params = new URLSearchParams(window.location.search);
  const urlProfile =
    params.get("voiceProfile") ??
    params.get("profileId") ??
    params.get("callProfile");
  if (isVoiceProfileId(urlProfile)) {
    return urlProfile;
  }

  const storedProfile = window.localStorage.getItem("voiceProfileId");

  return isVoiceProfileId(storedProfile) ? storedProfile : "meeting-recorder";
};
export const getInitialVoiceRoutingMode = (): VoiceRoutingMode => {
  if (typeof window === "undefined") {
    return "balanced";
  }

  const urlRouting = new URLSearchParams(window.location.search).get("routing");
  if (isVoiceRoutingMode(urlRouting)) {
    return urlRouting;
  }

  const storedRouting = window.localStorage.getItem("voiceRoutingMode");

  return isVoiceRoutingMode(storedRouting) ? storedRouting : "balanced";
};
export const getInitialVoiceSpeechEngine = (): VoiceSpeechEngine => {
  if (typeof window === "undefined") {
    return "cascaded";
  }

  const urlEngine = new URLSearchParams(window.location.search).get("engine");
  if (isVoiceSpeechEngine(urlEngine)) {
    return urlEngine;
  }

  const storedEngine = window.localStorage.getItem("voiceSpeechEngine");

  return isVoiceSpeechEngine(storedEngine) ? storedEngine : "cascaded";
};
export const getVoiceProfileSwitchGuardDecision = (
  metadata: Record<string, unknown> | null | undefined,
): VoiceProfileSwitchGuardClientDecision | null => {
  if (!metadata || !isRecord(metadata.profileSwitchGuard)) {
    return null;
  }

  const decision = metadata.profileSwitchGuard;

  return {
    action: readString(decision, "action"),
    autoApplied:
      typeof decision.autoApplied === "boolean"
        ? decision.autoApplied
        : undefined,
    confidence: readNumber(decision, "confidence"),
    minConfidence: readNumber(decision, "minConfidence"),
    mode: readString(decision, "mode"),
    previousProfileId: readString(decision, "previousProfileId"),
    recommendedProfileId: readString(decision, "recommendedProfileId"),
    reason: readString(decision, "reason"),
    selectedProfileId: readString(decision, "selectedProfileId"),
  };
};
export const getVoiceSpeechEngineSampleRate = (engine: VoiceSpeechEngine) =>
  VOICE_SPEECH_ENGINES.find((item) => item.id === engine)?.sampleRateHz ??
  16_000;
export const rememberVoiceModelProvider = (provider: VoiceModelProvider) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("voiceModelProvider", provider);
  }
};
export const rememberVoiceProfileId = (profileId: VoiceProfileId) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("voiceProfileId", profileId);
  }
};
export const rememberVoiceRoutingMode = (routing: VoiceRoutingMode) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("voiceRoutingMode", routing);
  }
};
export const rememberVoiceSpeechEngine = (engine: VoiceSpeechEngine) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("voiceSpeechEngine", engine);
  }
};

const getVoiceScenarioLabel = (scenarioId: VoiceScenarioId) =>
  scenarioId === "guided" ? "Guided test" : "General recording";
export const getVoiceModeLabel = getVoiceScenarioLabel;

const getVoiceScenarioPrompt = (input: {
  scenarioId: VoiceScenarioId | null;
  hasStarted: boolean;
  status?: string;
  turnCount: number;
}) => {
  if (!input.scenarioId) {
    return "Choose a scenario to begin. Guided test asks follow-up prompts. General recording just captures what you say.";
  }

  if (input.status === "completed") {
    return input.scenarioId === "guided"
      ? "Guided test complete. Review the saved summary below."
      : "Recording saved. Start again if you want another capture.";
  }

  if (!input.hasStarted) {
    return input.scenarioId === "guided"
      ? `Click Start guided test to begin. First prompt: ${VOICE_TEST_QUESTIONS[0]}`
      : "Click Start general recording to capture one freeform answer.";
  }

  if (input.scenarioId === "general") {
    return input.turnCount === 0
      ? "Speak freely. When you pause, the recording will be captured."
      : "Recording captured. You can stop the microphone or start another recording.";
  }

  return (
    VOICE_TEST_QUESTIONS[input.turnCount] ??
    "All prompts are covered. You can stop the microphone or keep speaking for extra detail."
  );
};

export const getVoiceLeadMessage = (input: {
  scenarioId?: VoiceScenarioId | null;
  mode?: VoiceDemoMode | null;
  hasStarted: boolean;
  status?: string;
  turnCount: number;
}) => {
  const scenarioId = input.scenarioId ?? input.mode ?? null;

  if (!scenarioId) {
    return "Pick a scenario to begin the demo.";
  }

  if (!input.hasStarted) {
    return scenarioId === "guided"
      ? "I can walk you through a short three-turn voice test."
      : "I can capture one freeform recording and confirm that it landed.";
  }

  return getVoiceScenarioPrompt({
    ...input,
    scenarioId,
  });
};

export const getVoiceModePrompt = (input: {
  mode: VoiceDemoMode | null;
  hasStarted: boolean;
  status?: string;
  turnCount: number;
}) =>
  getVoiceScenarioPrompt({
    ...input,
    scenarioId: input.mode,
  });
