export const VOICE_ASSISTANT_CONFIG = {
  artifacts: [
    "review artifact",
    "ops task",
    "integration event",
    "trace-ready session",
  ],
  experiments: ["baseline guide copy", "direct support copy"],
  guardrails: [
    "Escalate when the caller asks for a human",
    "Route transfer, voicemail, and no-answer intents into call outcomes",
  ],
  id: "support",
  modelProvider: "deterministic",
  recipe: "support-triage",
  tools: ["intake classifier", "lifecycle router", "review/task recorder"],
} as const;
