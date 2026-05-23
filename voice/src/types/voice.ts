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
