import { Component, Input } from "@angular/core";
import type { VOICE_ASSISTANT_CONFIG } from "../../../../constants/assistant";

@Component({
  host: {
    class: "voice-card voice-assistant-config",
  },
  selector: "article[voiceAssistantConfigCard]",
  standalone: true,
  templateUrl: "./assistant-config-card.html",
})
export class AssistantConfigCardComponent {
  @Input({ required: true }) assistantConfig!: typeof VOICE_ASSISTANT_CONFIG;
}
