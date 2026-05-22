import type { VoiceAgentSquadDemoStatus } from "../../../shared/demo";

type AgentSquadCardProps = {
  agentSquadStatus: VoiceAgentSquadDemoStatus | null;
};

export const AgentSquadCard = (props: AgentSquadCardProps) => (
  <article className="voice-card voice-agent-squad-card">
    <span className="voice-framework-pill">Agent Squad</span>
    <h2>Specialist routing is live</h2>
    <p className="voice-footnote">
      Say “I have a billing question about my invoice” to route from the front
      desk to billing with a compact context policy.
    </p>
    <div className="voice-routing-grid">
      <div>
        <span>Current specialist</span>
        <strong>
          {props.agentSquadStatus?.currentAgentId ?? "front-desk"}
        </strong>
      </div>
      <div>
        <span>Context policy</span>
        <strong>
          {props.agentSquadStatus?.contextPolicy ??
            "handoff-summary-current-turn"}
        </strong>
      </div>
      <div>
        <span>Handoffs</span>
        <strong>{props.agentSquadStatus?.handoffCount ?? 0}</strong>
      </div>
      <div>
        <span>Messages sent</span>
        <strong>{props.agentSquadStatus?.messageCount ?? "ready"}</strong>
      </div>
    </div>
    <p className="voice-footnote">
      {props.agentSquadStatus?.lastHandoff
        ? `${props.agentSquadStatus.lastHandoff.fromAgentId} → ${props.agentSquadStatus.lastHandoff.targetAgentId}: ${props.agentSquadStatus.lastHandoff.summary ?? props.agentSquadStatus.lastHandoff.reason ?? "handoff applied"}`
        : "No specialist handoff in this session yet."}
    </p>
    <p className="voice-footnote">
      <a href="/agent-squad-contract">Open squad contract proof</a>
    </p>
  </article>
);
