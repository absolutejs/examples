import { Component, EventEmitter, Input, Output } from "@angular/core";
import type {
  VoiceCampaignDialerProofService,
} from "@absolutejs/voice/angular";

type CampaignDialerProofConnection = ReturnType<
  VoiceCampaignDialerProofService["connect"]
>;

@Component({
  host: {
    class: "voice-card voice-provider-health-card",
  },
  selector: "article[voiceCampaignDialerCard]",
  standalone: true,
  template: `
    <span class="voice-framework-pill">Campaign Dialer Proof</span>
    <h2>Carrier dialer dry-run</h2>
    <p class="voice-footnote">
      Twilio, Telnyx, and Plivo campaign dials run through the Angular service,
      attach campaign metadata, and resolve synthetic webhook outcomes.
    </p>
    <button
      class="absolute-voice-turn-latency__proof"
      type="button"
      [disabled]="campaignDialerProof.isLoading()"
      (click)="runProof.emit()"
    >
      {{
        campaignDialerProof.isLoading()
          ? "Running proof"
          : "Run campaign dialer proof"
      }}
    </button>
    @if (campaignDialerProof.report()?.providers?.length) {
      <div class="voice-provider-health-list">
        @for (
          provider of campaignDialerProof.report()!.providers;
          track provider.provider
        ) {
          <div class="voice-provider-health-item">
            <strong>{{ provider.provider }}</strong>
            <span>
              {{
                campaignDialerProofProviderPassed(provider)
                  ? "passed"
                  : "needs attention"
              }}
            </span>
            <small>
              {{ provider.carrierRequests.length }} dry-run carrier request{{
                provider.carrierRequests.length === 1 ? "" : "s"
              }}
            </small>
          </div>
        }
      </div>
    } @else {
      <p class="empty-copy">
        Ready for
        {{
          (
            campaignDialerProof.status()?.providers ?? [
              "twilio",
              "telnyx",
              "plivo",
            ]
          ).join(", ")
        }}.
      </p>
    }
    @if (campaignDialerProof.error()) {
      <p class="voice-footnote">{{ campaignDialerProof.error() }}</p>
    }
    <p class="voice-footnote">
      <a href="/voice/campaigns/dialer-proof">Open full proof</a>
    </p>
  `,
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
