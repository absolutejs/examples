import { VOICE_PROOF_DASHBOARDS } from "../../../constants/navigation";

export const ProofDashboardsCard = () => (
  <article className="voice-card voice-proof-dashboard-card">
    <span className="voice-framework-pill">Proof dashboards</span>
    <h2>Open the production evidence</h2>
    <p className="voice-footnote">
      The same trace-backed package routes work in every framework:
      interruption, live timing, turn waterfalls, readiness, and provider
      contracts.
    </p>
    <div className="voice-proof-links">
      {VOICE_PROOF_DASHBOARDS.map((dashboard) => (
        <a href={dashboard.href} key={dashboard.href}>
          <strong>{dashboard.label}</strong>
          <span>{dashboard.description}</span>
        </a>
      ))}
    </div>
  </article>
);
