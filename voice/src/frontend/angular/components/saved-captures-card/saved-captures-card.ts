import { Component, Input } from "@angular/core";
import { getVoiceModeLabel } from "../../../../shared/demo";
import type { SavedIntake } from "../../../../types/domain";
import { formatDateTime } from "../../../../shared/browser";

@Component({
  host: {
    class: "voice-card voice-hero",
  },
  selector: "article[voiceSavedCapturesCard]",
  standalone: true,
  templateUrl: "./saved-captures-card.html",
})
export class SavedCapturesCardComponent {
  @Input({ required: true }) savedIntakes!: SavedIntake[];
  formatDateTime = formatDateTime;
  getVoiceModeLabel = getVoiceModeLabel;
}
