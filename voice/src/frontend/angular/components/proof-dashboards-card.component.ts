import { Component } from "@angular/core";
import { VOICE_PROOF_DASHBOARDS } from "../../../constants/navigation";

@Component({
  host: {
    class: "voice-card voice-proof-dashboard-card",
  },
  selector: "article[voiceProofDashboardsCard]",
  standalone: true,
  template: `
    <span class="voice-framework-pill">Proof dashboards</span>
    <h2>Open the production evidence</h2>
    <p class="voice-footnote">
      The same trace-backed package routes work in every framework:
      interruption, live timing, turn waterfalls, readiness, and provider
      contracts.
    </p>
    <div class="voice-proof-links">
      @for (dashboard of proofDashboards; track dashboard.href) {
        <a [href]="dashboard.href">
          <strong>{{ dashboard.label }}</strong>
          <span>{{ dashboard.description }}</span>
        </a>
      }
    </div>
  `,
})
export class ProofDashboardsCardComponent {
  proofDashboards = VOICE_PROOF_DASHBOARDS;
}
