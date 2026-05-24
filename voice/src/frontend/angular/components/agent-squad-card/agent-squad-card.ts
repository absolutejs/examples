import { Component, Input } from "@angular/core";
import type { VoiceAgentSquadDemoStatus } from "../../../../types/domain";

@Component({
  host: {
    class: "voice-card voice-agent-squad-card",
  },
  selector: "article[voiceAgentSquadCard]",
  standalone: true,
  templateUrl: "./agent-squad-card.html",
})
export class AgentSquadCardComponent {
  @Input({ required: true })
  agentSquadStatus!: VoiceAgentSquadDemoStatus | null;
}
