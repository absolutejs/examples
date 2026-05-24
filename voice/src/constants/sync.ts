// Shared between the backend (publish + SSE plugin) and the frontends (subscribe),
// so the reactive topic and endpoint never drift.
export const VOICE_SYNC_PATH = "/api/sync";

export const VOICE_INTAKES_TOPIC = "voice:intakes";

// Live agent-squad status, derived from per-turn agent.context/agent.handoff
// trace events. Republished on every committed turn (see channelDefaults.ts).
// Per-session so a browser only refetches when *its* session advances.
export const VOICE_AGENT_SQUAD_TOPIC = "voice:agent-squad";
export const voiceAgentSquadTopic = (sessionId: string) =>
  `${VOICE_AGENT_SQUAD_TOPIC}:${sessionId}`;

// Real-call evidence worker health. Republished after each worker collect tick
// (see realCallEvidence.ts onCollect).
export const VOICE_WORKER_HEALTH_TOPIC = "voice:worker-health";

// Two coarse dashboard groups, so widgets refetch only when their kind of data
// actually moves instead of each polling on its own timer:
//   voice:turn     — live-call surfaces (routing, turn quality/latency, traces,
//                    session snapshot/observability, call debugger, ops status,
//                    delivery runtime, workflow status). Published per committed
//                    turn (channelDefaults.ts).
//   voice:evidence — accumulated proof/profile/provider evidence (proof trends,
//                    platform coverage, profile comparison, reconnect evidence,
//                    readiness, provider status/capabilities/contracts, profile
//                    switch). Published per committed turn AND per worker collect.
export const VOICE_TURN_TOPIC = "voice:turn";
export const VOICE_EVIDENCE_TOPIC = "voice:evidence";
