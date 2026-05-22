<script setup lang="ts">
type CampaignDialerProof = {
  error: string | null;
  isLoading: boolean;
  report?: {
    providers: Array<{
      carrierRequests: unknown[];
      outcomes: Array<{ applied: boolean }>;
      provider: string;
    }>;
  };
  status?: {
    providers: string[];
  };
};

type CampaignDialerCardProps = {
  campaignDialerProof: CampaignDialerProof;
  campaignDialerProofReadyProviders: string;
  onRunProof: () => void;
};

defineProps<CampaignDialerCardProps>();
</script>

<template>
  <article class="voice-card voice-provider-health-card">
    <span class="voice-framework-pill">Campaign Dialer Proof</span>
    <h2>Carrier dialer dry-run</h2>
    <p class="voice-footnote">
      Twilio, Telnyx, and Plivo campaign dials run through the shared Vue
      composable, attach campaign metadata, and resolve synthetic webhook
      outcomes.
    </p>
    <button
      class="absolute-voice-turn-latency__proof"
      type="button"
      :disabled="campaignDialerProof.isLoading"
      @click="onRunProof"
    >
      {{
        campaignDialerProof.isLoading
          ? "Running proof"
          : "Run campaign dialer proof"
      }}
    </button>
    <div
      v-if="campaignDialerProof.report?.providers?.length"
      class="voice-provider-health-list"
    >
      <div
        v-for="provider in campaignDialerProof.report.providers"
        :key="provider.provider"
        class="voice-provider-health-item"
      >
        <strong>{{ provider.provider }}</strong>
        <span>{{
          provider.outcomes.every((outcome) => outcome.applied)
            ? "passed"
            : "needs attention"
        }}</span>
        <small>
          {{ provider.carrierRequests.length }} dry-run carrier request{{
            provider.carrierRequests.length === 1 ? "" : "s"
          }}
        </small>
      </div>
    </div>
    <p v-else class="empty-copy">
      Ready for {{ campaignDialerProofReadyProviders }}.
    </p>
    <p v-if="campaignDialerProof.error" class="voice-footnote">
      {{ campaignDialerProof.error }}
    </p>
    <p class="voice-footnote">
      <a href="/voice/campaigns/dialer-proof">Open full proof</a>
    </p>
  </article>
</template>
