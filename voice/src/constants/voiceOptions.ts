import type {
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceSpeechEngine,
} from "../types/voice";

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
