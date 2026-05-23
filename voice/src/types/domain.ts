import type { VoiceLiveOpsActionResult as CoreVoiceLiveOpsActionResult } from "@absolutejs/voice/client";
import type { VoiceDemoMode, VoiceScenarioId } from "./voice";

export type { VoiceLiveOpsAction } from "@absolutejs/voice/client";

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

export type VoiceLiveOpsActionResult = CoreVoiceLiveOpsActionResult & {
  incidentBundleHref: string;
  operationsRecordHref: string;
  task?: { id: string; title: string };
  taskHref?: string;
};
