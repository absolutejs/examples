import type { useVoiceCampaignDialerProof } from "@absolutejs/voice/react";

type CampaignDialerCardProps = {
  campaignDialerProof: ReturnType<typeof useVoiceCampaignDialerProof>;
};

export const CampaignDialerCard = (props: CampaignDialerCardProps) => (
  <article className="voice-card voice-provider-health-card">
    <span className="voice-framework-pill">Campaign Dialer Proof</span>
    <h2>Carrier dialer dry-run</h2>
    <p className="voice-footnote">
      Twilio, Telnyx, and Plivo campaign dials run through the shared React
      hook, attach campaign metadata, and resolve synthetic webhook outcomes.
    </p>
    <button
      className="absolute-voice-turn-latency__proof"
      disabled={props.campaignDialerProof.isLoading}
      onClick={() => {
        void props.campaignDialerProof.runProof().catch(() => {});
      }}
      type="button"
    >
      {props.campaignDialerProof.isLoading
        ? "Running proof"
        : "Run campaign dialer proof"}
    </button>
    <div className="voice-provider-health-list">
      {(props.campaignDialerProof.report?.providers ?? []).map((provider) => (
        <div className="voice-provider-health-item" key={provider.provider}>
          <strong>{provider.provider}</strong>
          <span>
            {provider.outcomes.every((outcome) => outcome.applied)
              ? "passed"
              : "needs attention"}
          </span>
          <small>
            {provider.carrierRequests.length} dry-run carrier request
            {provider.carrierRequests.length === 1 ? "" : "s"}
          </small>
        </div>
      ))}
    </div>
    {props.campaignDialerProof.error ? (
      <p className="voice-footnote">{props.campaignDialerProof.error}</p>
    ) : null}
    {!props.campaignDialerProof.report ? (
      <p className="empty-copy">
        Ready for{" "}
        {(
          props.campaignDialerProof.status?.providers ?? [
            "twilio",
            "telnyx",
            "plivo",
          ]
        ).join(", ")}
        .
      </p>
    ) : null}
    <p className="voice-footnote">
      <a href="/voice/campaigns/dialer-proof">Open full proof</a>
    </p>
  </article>
);
