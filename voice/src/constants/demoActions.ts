import type { VoiceLiveOpsAction } from "../types/domain";

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

export const VOICE_LIVE_OPS_ACTIONS: Array<{
  action: VoiceLiveOpsAction;
  description: string;
  label: string;
}> = [
  {
    action: "tag",
    description: "Attach a lightweight audit tag to the active session.",
    label: "Tag",
  },
  {
    action: "assign",
    description: "Record which operator owns the live session.",
    label: "Assign",
  },
  {
    action: "escalate",
    description: "Create an in-progress escalation task and trace event.",
    label: "Escalate",
  },
  {
    action: "create-task",
    description: "Create an open follow-up task from the active call.",
    label: "Create task",
  },
  {
    action: "pause-assistant",
    description:
      "Stop assistant-side automation while the operator intervenes.",
    label: "Pause assistant",
  },
  {
    action: "resume-assistant",
    description: "Release the session back to assistant automation.",
    label: "Resume assistant",
  },
  {
    action: "operator-takeover",
    description: "Mark the call as human-owned and pause local capture.",
    label: "Take over",
  },
  {
    action: "force-handoff",
    description: "Force the session to the queue named by the tag field.",
    label: "Force handoff",
  },
  {
    action: "inject-instruction",
    description: "Record an operator instruction for the assistant trace.",
    label: "Inject instruction",
  },
];
