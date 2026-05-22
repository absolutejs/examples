<script lang="ts">
  type CampaignDialerProofSnapshot = {
    error: string | null;
    isLoading: boolean;
    report?: {
      providers: Array<{
        carrierRequests: unknown[];
        outcomes: Array<{ applied: boolean }>;
        provider: string;
      }>;
    };
    status?: { providers: string[] };
  };

  type CampaignDialerCardProps = {
    campaignDialerProofReadyProviders: string;
    campaignDialerProofSnapshot: CampaignDialerProofSnapshot;
    onRunProof: () => void;
  };

  let {
    campaignDialerProofReadyProviders,
    campaignDialerProofSnapshot,
    onRunProof,
  }: CampaignDialerCardProps = $props();
</script>

<article class="voice-card voice-provider-health-card">
  <span class="voice-framework-pill">Campaign Dialer Proof</span>
  <h2>Carrier dialer dry-run</h2>
  <p class="voice-footnote">
    Twilio, Telnyx, and Plivo campaign dials run through the shared Svelte
    creator, attach campaign metadata, and resolve synthetic webhook outcomes.
  </p>
  <button
    class="absolute-voice-turn-latency__proof"
    type="button"
    disabled={campaignDialerProofSnapshot?.isLoading}
    on:click={onRunProof}
  >
    {campaignDialerProofSnapshot?.isLoading
      ? "Running proof"
      : "Run campaign dialer proof"}
  </button>
  {#if campaignDialerProofSnapshot?.report?.providers?.length}
    <div class="voice-provider-health-list">
      {#each campaignDialerProofSnapshot.report.providers as provider}
        <div class="voice-provider-health-item">
          <strong>{provider.provider}</strong>
          <span>
            {provider.outcomes.every((outcome) => outcome.applied)
              ? "passed"
              : "needs attention"}
          </span>
          <small>
            {provider.carrierRequests.length} dry-run carrier request{provider
              .carrierRequests.length === 1
              ? ""
              : "s"}
          </small>
        </div>
      {/each}
    </div>
  {:else}
    <p class="empty-copy">
      Ready for {campaignDialerProofReadyProviders}.
    </p>
  {/if}
  {#if campaignDialerProofSnapshot?.error}
    <p class="voice-footnote">{campaignDialerProofSnapshot.error}</p>
  {/if}
  <p class="voice-footnote">
    <a href="/voice/campaigns/dialer-proof">Open full proof</a>
  </p>
</article>
