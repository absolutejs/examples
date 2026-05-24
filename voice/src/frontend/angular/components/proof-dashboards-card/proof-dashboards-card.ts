import { Component } from "@angular/core";
import { VOICE_PROOF_DASHBOARDS } from "../../../../constants/navigation";

@Component({
  host: {
    class: "voice-card voice-proof-dashboard-card",
  },
  selector: "article[voiceProofDashboardsCard]",
  standalone: true,
  templateUrl: "./proof-dashboards-card.html",
})
export class ProofDashboardsCardComponent {
  proofDashboards = VOICE_PROOF_DASHBOARDS;
}
