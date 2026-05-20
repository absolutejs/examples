export type FrameworkId =
  | "react"
  | "vue"
  | "svelte"
  | "angular"
  | "html"
  | "htmx";

export type VoiceScenarioId = "guided" | "general";
export type VoiceDemoMode = VoiceScenarioId;
export type VoiceSpeechEngine = "cascaded" | "openai-realtime";
export type VoiceModelProvider =
  | "deterministic"
  | "openai"
  | "anthropic"
  | "gemini";
export type VoiceRoutingMode = "balanced" | "fastest" | "cheapest" | "quality";
export type VoiceProfileId =
  | "meeting-recorder"
  | "support-agent"
  | "appointment-scheduler"
  | "noisy-phone-call";
export type VoiceProviderStatus =
  | "healthy"
  | "idle"
  | "rate-limited"
  | "degraded"
  | "recoverable"
  | "suppressed";

export type VoiceProviderStatusRecord = {
  averageElapsedMs?: number;
  errorCount: number;
  fallbackCount: number;
  lastError?: string;
  lastErrorAt?: number;
  lastSuccessAt?: number;
  provider: VoiceModelProvider;
  recommended: boolean;
  runCount: number;
  status: VoiceProviderStatus;
  suppressionRemainingMs?: number;
  suppressedUntil?: number;
};

export type VoiceAgentSquadDemoStatus = {
  at?: number;
  contextPolicy: "default" | "handoff-summary-current-turn";
  currentAgentId: string;
  handoffCount: number;
  lastHandoff?: {
    fromAgentId?: string;
    reason?: string;
    status?: string;
    summary?: string;
    targetAgentId?: string;
  };
  messageCount?: number;
  sessionId?: string;
  status: "idle" | "active";
};

export const VOICE_MODEL_PROVIDERS: Array<{
  id: VoiceModelProvider;
  label: string;
  shortLabel: string;
}> = [
  {
    id: "deterministic",
    label: "Deterministic local model",
    shortLabel: "Local",
  },
  { id: "openai", label: "OpenAI", shortLabel: "OpenAI" },
  { id: "anthropic", label: "Anthropic Claude", shortLabel: "Claude" },
  { id: "gemini", label: "Google Gemini", shortLabel: "Gemini" },
];

export const VOICE_ROUTING_MODES: Array<{
  description: string;
  id: VoiceRoutingMode;
  label: string;
  shortLabel: string;
}> = [
  {
    description: "Weighted cost, latency, and accuracy for normal production.",
    id: "balanced",
    label: "Balanced routing",
    shortLabel: "Balanced",
  },
  {
    description: "Prefer the lowest expected STT latency for live calls.",
    id: "fastest",
    label: "Fastest realtime",
    shortLabel: "Fastest",
  },
  {
    description: "Prefer lower-cost STT providers when available.",
    id: "cheapest",
    label: "Cheapest acceptable",
    shortLabel: "Cheapest",
  },
  {
    description: "Prefer the highest profiled transcript quality.",
    id: "quality",
    label: "Quality first",
    shortLabel: "Quality",
  },
];

export const VOICE_PROFILES: Array<{
  description: string;
  id: VoiceProfileId;
  label: string;
  shortLabel: string;
}> = [
  {
    description: "General browser recording with meeting-focused defaults.",
    id: "meeting-recorder",
    label: "Meeting recorder",
    shortLabel: "Meeting",
  },
  {
    description: "Support triage defaults for guided handoff and tool flows.",
    id: "support-agent",
    label: "Support agent",
    shortLabel: "Support",
  },
  {
    description: "Scheduling flow tuned for booking and appointment capture.",
    id: "appointment-scheduler",
    label: "Appointment scheduler",
    shortLabel: "Scheduler",
  },
  {
    description: "Noisy phone-call profile for tougher STT routing conditions.",
    id: "noisy-phone-call",
    label: "Noisy phone call",
    shortLabel: "Noisy",
  },
];

export const VOICE_SPEECH_ENGINES: Array<{
  description: string;
  id: VoiceSpeechEngine;
  label: string;
  sampleRateHz: number;
  shortLabel: string;
}> = [
  {
    description:
      "Deepgram or AssemblyAI STT, routed LLM, and OpenAI/emergency TTS.",
    id: "cascaded",
    label: "Cascaded STT + LLM + TTS",
    sampleRateHz: 16_000,
    shortLabel: "Cascaded",
  },
  {
    description:
      "Direct OpenAI Realtime speech-to-speech route with 24kHz PCM.",
    id: "openai-realtime",
    label: "OpenAI Realtime",
    sampleRateHz: 24_000,
    shortLabel: "Realtime",
  },
];

export const VOICE_PROOF_DASHBOARDS = [
  {
    description:
      "One action runs the demo proof suite and links every surface.",
    href: "/demo-proof",
    label: "Run full proof",
  },
  {
    description: "Interruption stop latency from browser barge-in events.",
    href: "/barge-in",
    label: "Barge-in",
  },
  {
    description: "Speech-to-assistant timing from live browser traces.",
    href: "/live-latency",
    label: "Live latency",
  },
  {
    description: "Turn waterfall from speech detection through first audio.",
    href: "/turn-latency",
    label: "Turn waterfall",
  },
  {
    description:
      "Repeated provider, turn, live-latency, recovery, and readiness trends.",
    href: "/voice/proof-trends",
    label: "Sustained trends",
  },
  {
    description: "Session timelines across providers, tools, and recovery.",
    href: "/traces",
    label: "Trace timelines",
  },
  {
    description:
      "Single-session trace, audit, handoff, and tool support record.",
    href: "/voice-operations/demo-incident-bundle",
    label: "Operations record",
  },
  {
    description:
      "Copyable incident handoff generated from the operations record.",
    href: "/voice-operations/demo-incident-bundle/incident.md",
    label: "Incident handoff",
  },
  {
    description: "Redacted Markdown export for support and incident response.",
    href: "/voice-incidents/demo-incident-bundle/markdown",
    label: "Incident bundle",
  },
  {
    description: "Deploy gate for runtime, providers, sinks, and proof.",
    href: "/production-readiness",
    label: "Readiness",
  },
  {
    description:
      "Provider fallback, queue failures, handoffs, live ops, and latency SLOs.",
    href: "/ops-recovery",
    label: "Ops recovery",
  },
  {
    description:
      "Redaction, retention dry-runs, audit exports, and provider key posture.",
    href: "/data-control",
    label: "Data control",
  },
  {
    description: "Configured provider capability and fallback matrix.",
    href: "/provider-contracts",
    label: "Provider contracts",
  },
  {
    description:
      "Auto, recommend, off, allowed, blocked, and max-switch guard policies.",
    href: "/voice/profile-switch-policy",
    label: "Profile policy",
  },
  {
    description:
      "Real profile guard decisions from audit and trace evidence.",
    href: "/voice/profile-switch-live-decisions",
    label: "Profile decisions",
  },
  {
    description:
      "Deploy-facing gate for profile switch policy, audit, trace, and live evidence.",
    href: "/voice/profile-switch-readiness",
    label: "Profile readiness",
  },
] as const;

export const isVoiceModelProvider = (
  value: unknown,
): value is VoiceModelProvider =>
  value === "deterministic" ||
  value === "openai" ||
  value === "anthropic" ||
  value === "gemini";

export const isVoiceRoutingMode = (value: unknown): value is VoiceRoutingMode =>
  value === "balanced" ||
  value === "fastest" ||
  value === "cheapest" ||
  value === "quality";

export const isVoiceProfileId = (value: unknown): value is VoiceProfileId =>
  value === "meeting-recorder" ||
  value === "support-agent" ||
  value === "appointment-scheduler" ||
  value === "noisy-phone-call";

export const isVoiceSpeechEngine = (
  value: unknown,
): value is VoiceSpeechEngine =>
  value === "cascaded" || value === "openai-realtime";

export type SavedIntake = {
  callDisposition?:
    | "completed"
    | "transferred"
    | "escalated"
    | "voicemail"
    | "no-answer"
    | "silence-timeout"
    | "failed"
    | "closed";
  callReason?: string;
  callTarget?: string;
  id: string;
  sessionId: string;
  scenarioId: VoiceScenarioId;
  mode: VoiceDemoMode;
  title: string;
  transcript: string;
  assistantSummary: string;
  completedAt: number;
  promptAnswers: Array<{
    prompt: string;
    response: string;
  }>;
  turns: string[];
  turnCount: number;
  detectedName?: string;
};

export const VOICE_ROUTE_PATH = "/voice/intake";
export const VOICE_REALTIME_ROUTE_PATH = "/voice/realtime";

export const VOICE_DEMO_GUIDE_TITLE = "Run the guided voice test";

export const VOICE_DEMO_GUIDE_STEPS = [
  "Click Start voice test to begin the first prompt.",
  "Answer in your own words, then pause so the turn commits.",
  "You can also say operational phrases like transfer me to billing, escalate this, send it to voicemail, or no answer.",
  "Keep following the next prompt after each committed turn, or click Stop microphone when you are done.",
];

export const VOICE_DEMO_GUIDED_LABEL = "Start guided test";

export const VOICE_DEMO_GENERAL_LABEL = "Start general recording";

export const VOICE_DEMO_STOP_LABEL = "Stop microphone";

export const VOICE_CALL_CONTROL_ACTIONS = [
  {
    action: "transfer",
    label: "Transfer to billing",
    reason: "demo-button-transfer",
    target: "billing",
  },
  {
    action: "escalate",
    label: "Escalate",
    reason: "demo-button-escalation",
  },
  {
    action: "voicemail",
    label: "Send voicemail",
  },
  {
    action: "no-answer",
    label: "No answer",
  },
] as const;

export const VOICE_DEMO_MIC_IDLE =
  "Ready. Start guided test or general recording to begin.";

export const VOICE_DEMO_MIC_LIVE =
  "Live. Answer the prompt, then click Stop microphone when finished.";

export const VOICE_ASSISTANT_CONFIG = {
  id: "support",
  modelProvider: "deterministic",
  recipe: "support-triage",
  tools: ["intake classifier", "lifecycle router", "review/task recorder"],
  guardrails: [
    "Escalate when the caller asks for a human",
    "Route transfer, voicemail, and no-answer intents into call outcomes",
  ],
  experiments: ["baseline guide copy", "direct support copy"],
  artifacts: [
    "review artifact",
    "ops task",
    "integration event",
    "trace-ready session",
  ],
} as const;

export const VOICE_TEST_QUESTIONS = [
  "Start with a quick introduction about who you are.",
  "Now describe what you are trying to do or test.",
  "Finish with any detail that feels blocked, risky, or unclear.",
] as const;

export const getVoiceRoutePath = (
  scenarioId: VoiceScenarioId,
  provider?: VoiceModelProvider,
  routing?: VoiceRoutingMode,
  engine: VoiceSpeechEngine = "cascaded",
  profileId?: VoiceProfileId,
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

  const path =
    engine === "openai-realtime" ? VOICE_REALTIME_ROUTE_PATH : VOICE_ROUTE_PATH;

  return `${path}?${params.toString()}`;
};

export const getVoiceProviderLabel = (provider: VoiceModelProvider) =>
  VOICE_MODEL_PROVIDERS.find((item) => item.id === provider)?.label ?? provider;

export const getVoiceRoutingLabel = (routing?: string) =>
  VOICE_ROUTING_MODES.find((item) => item.id === routing)?.label ??
  routing ??
  "Unknown";

export const getVoiceProfileLabel = (profileId?: string) =>
  VOICE_PROFILES.find((item) => item.id === profileId)?.label ??
  profileId ??
  "Unknown";

export type VoiceProfileSwitchGuardClientDecision = {
  action?: string;
  autoApplied?: boolean;
  confidence?: number;
  minConfidence?: number;
  mode?: string;
  previousProfileId?: string;
  recommendedProfileId?: string;
  reason?: string;
  selectedProfileId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined =>
  typeof record[key] === "string" ? (record[key] as string) : undefined;

const readNumber = (
  record: Record<string, unknown>,
  key: string,
): number | undefined =>
  typeof record[key] === "number" && Number.isFinite(record[key])
    ? (record[key] as number)
    : undefined;

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

export const getVoiceSpeechEngineLabel = (engine: VoiceSpeechEngine) =>
  VOICE_SPEECH_ENGINES.find((item) => item.id === engine)?.label ?? engine;

export const getVoiceSpeechEngineSampleRate = (engine: VoiceSpeechEngine) =>
  VOICE_SPEECH_ENGINES.find((item) => item.id === engine)?.sampleRateHz ??
  16_000;

export const getVoiceProviderStatusLabel = (status: VoiceProviderStatus) => {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "rate-limited":
      return "Rate limited";
    case "degraded":
      return "Degraded";
    case "recoverable":
      return "Recoverable";
    case "suppressed":
      return "Temporarily suppressed";
    case "idle":
      return "Idle";
  }
};

export const fetchVoiceProviderStatus = async () => {
  const response = await fetch("/api/provider-status");
  return (await response.json()) as VoiceProviderStatusRecord[];
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

export const rememberVoiceModelProvider = (provider: VoiceModelProvider) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("voiceModelProvider", provider);
  }
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

export const rememberVoiceRoutingMode = (routing: VoiceRoutingMode) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("voiceRoutingMode", routing);
  }
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

export const rememberVoiceProfileId = (profileId: VoiceProfileId) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("voiceProfileId", profileId);
  }
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

export const rememberVoiceSpeechEngine = (engine: VoiceSpeechEngine) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("voiceSpeechEngine", engine);
  }
};

export const getVoiceScenarioLabel = (scenarioId: VoiceScenarioId) =>
  scenarioId === "guided" ? "Guided test" : "General recording";
export const getVoiceModeLabel = getVoiceScenarioLabel;

export const getVoiceScenarioPrompt = (input: {
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

export const getVoiceLeadMessageLegacy = (input: {
  mode: VoiceDemoMode | null;
  hasStarted: boolean;
  status?: string;
  turnCount: number;
}) =>
  getVoiceLeadMessage({
    ...input,
    scenarioId: input.mode,
  });

export const FRAMEWORKS: Array<{
  id: FrameworkId;
  href: string;
  label: string;
}> = [
  { id: "react", href: "/react", label: "React" },
  { id: "svelte", href: "/svelte", label: "Svelte" },
  { id: "vue", href: "/vue", label: "Vue" },
  { id: "angular", href: "/angular", label: "Angular" },
  { id: "html", href: "/html", label: "HTML" },
  { id: "htmx", href: "/htmx", label: "HTMX" },
];

export const FRAMEWORK_SNIPPETS: Record<FrameworkId, string> = {
  angular: `import { VoiceStreamService } from "@absolutejs/voice/angular";

voice = inject(VoiceStreamService).connect("${VOICE_ROUTE_PATH}");
voice.endTurn();
voice.sendAudio(audioChunk);`,
  html: `import { createVoiceStream } from "@absolutejs/voice/client";

const voice = createVoiceStream("${VOICE_ROUTE_PATH}");
voice.callControl({ action: "transfer", target: "billing" });
voice.endTurn();
voice.sendAudio(audioChunk);`,
  htmx: `import { bindVoiceHTMX, createVoiceStream } from "@absolutejs/voice/client";

voice({
  path: "${VOICE_ROUTE_PATH}",
  htmx: true,
  ...
});`,
  react: `import { useVoiceStream } from "@absolutejs/voice/react";

const voice = useVoiceStream("${VOICE_ROUTE_PATH}");
voice.callControl({ action: "escalate", reason: "caller asked for a human" });
voice.endTurn();
voice.sendAudio(audioChunk);`,
  svelte: `import { createVoiceStream } from "@absolutejs/voice/svelte";

const voice = createVoiceStream("${VOICE_ROUTE_PATH}");
voice.subscribe(syncState);
voice.sendAudio(audioChunk);`,
  vue: `import { useVoiceStream } from "@absolutejs/voice/vue";

const voice = useVoiceStream("${VOICE_ROUTE_PATH}");
voice.callControl({ action: "voicemail" });
voice.endTurn();
voice.sendAudio(audioChunk);`,
};

export const FRAMEWORK_DESCRIPTIONS: Record<FrameworkId, string> = {
  angular:
    "Angular uses VoiceStreamService to expose computed signals from the shared voice connection.",
  html: "HTML uses the plain client primitive directly and keeps the page reactive with a lightweight DOM renderer.",
  htmx: "HTMX uses the plugin-owned HTMX render route and package bootstrap so the page stays declarative and never ships its own voice controller.",
  react:
    "React uses useVoiceStream so the page reacts to partials, committed turns, and completion state without custom wiring.",
  svelte:
    "Svelte uses the framework entrypoint and subscribes to the shared voice stream for local reactive state.",
  vue: "Vue uses the voice composable so refs stay aligned with the same client transport and reconnect lifecycle.",
};
