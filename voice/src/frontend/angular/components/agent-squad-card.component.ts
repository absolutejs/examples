import { Component, Input } from "@angular/core";
import type { VoiceAgentSquadDemoStatus } from "../../../types/domain";

@Component({
  host: {
    class: "voice-card voice-agent-squad-card",
  },
  selector: "article[voiceAgentSquadCard]",
  standalone: true,
  template: `
    <span class="voice-framework-pill">Agent Squad</span>
    <h2>Specialist routing is live</h2>
    <p class="voice-footnote">
      Say “I have a billing question about my invoice” to route from the front
      desk to billing with a compact context policy.
    </p>
    <div class="voice-routing-grid">
      <div>
        <span>Current specialist</span>
        <strong>{{ agentSquadStatus?.currentAgentId ?? "front-desk" }}</strong>
      </div>
      <div>
        <span>Context policy</span>
        <strong>{{
          agentSquadStatus?.contextPolicy ?? "handoff-summary-current-turn"
        }}</strong>
      </div>
      <div>
        <span>Handoffs</span>
        <strong>{{ agentSquadStatus?.handoffCount ?? 0 }}</strong>
      </div>
      <div>
        <span>Messages sent</span>
        <strong>{{ agentSquadStatus?.messageCount ?? "ready" }}</strong>
      </div>
    </div>
    <p class="voice-footnote">
      @if (agentSquadStatus?.lastHandoff; as handoff) {
        {{ handoff.fromAgentId }} → {{ handoff.targetAgentId }}:
        {{ handoff.summary ?? handoff.reason ?? "handoff applied" }}
      } @else {
        No specialist handoff in this session yet.
      }
    </p>
    <p class="voice-footnote">
      <a href="/agent-squad-contract">Open squad contract proof</a>
    </p>
  `,
})
export class AgentSquadCardComponent {
  @Input({ required: true })
  agentSquadStatus!: VoiceAgentSquadDemoStatus | null;
}
