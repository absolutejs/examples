<script lang="ts">
  import { VOICE_PROOF_DASHBOARDS } from "../../../constants/navigation";
</script>

<article class="voice-card voice-proof-dashboard-card">
  <span class="voice-framework-pill">Proof dashboards</span>
  <h2>Open the production evidence</h2>
  <p class="voice-footnote">
    The same trace-backed package routes work in every framework: interruption,
    live timing, turn waterfalls, readiness, and provider contracts.
  </p>
  <div class="voice-proof-links">
    {#each VOICE_PROOF_DASHBOARDS as dashboard}
      <a href={dashboard.href}>
        <strong>{dashboard.label}</strong>
        <span>{dashboard.description}</span>
      </a>
    {/each}
  </div>
</article>
