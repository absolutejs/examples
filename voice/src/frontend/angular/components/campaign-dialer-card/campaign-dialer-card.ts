import { Component, EventEmitter, Input, Output } from "@angular/core";
import type { VoiceCampaignDialerProofService } from "@absolutejs/voice/angular";

type CampaignDialerProofConnection = ReturnType<
  VoiceCampaignDialerProofService["connect"]
>;

@Component({
  host: {
    class: "voice-card voice-provider-health-card",
  },
  selector: "article[voiceCampaignDialerCard]",
  standalone: true,
  templateUrl: "./campaign-dialer-card.html",
})
export class CampaignDialerCardComponent {
  @Input({ required: true })
  campaignDialerProof!: CampaignDialerProofConnection;
  @Output() runProof = new EventEmitter<void>();

  campaignDialerProofProviderPassed(provider: {
    outcomes: Array<{ applied: boolean }>;
  }) {
    return provider.outcomes.every((outcome) => outcome.applied);
  }
}
