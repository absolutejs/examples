<script lang="ts">
  import type { VoiceAgentSquadDemoStatus } from "../../../shared/demo";

  type AgentSquadCardProps = {
    agentSquadStatus: VoiceAgentSquadDemoStatus | null;
  };

  let { agentSquadStatus }: AgentSquadCardProps = $props();
</script>

<article class="voice-card voice-agent-squad-card">
  <span class="voice-framework-pill">Agent Squad</span>
  <h2>Specialist routing is live</h2>
  <p class="voice-footnote">
    Say “I have a billing question about my invoice” to route from the front
    desk to billing with a compact context policy.
  </p>
  <div class="voice-routing-grid">
    <div>
      <span>Current specialist</span>
      <strong>{agentSquadStatus?.currentAgentId ?? "front-desk"}</strong>
    </div>
    <div>
      <span>Context policy</span>
      <strong>
        {agentSquadStatus?.contextPolicy ?? "handoff-summary-current-turn"}
      </strong>
    </div>
    <div>
      <span>Handoffs</span>
      <strong>{agentSquadStatus?.handoffCount ?? 0}</strong>
    </div>
    <div>
      <span>Messages sent</span>
      <strong>{agentSquadStatus?.messageCount ?? "ready"}</strong>
    </div>
  </div>
  <p class="voice-footnote">
    {#if agentSquadStatus?.lastHandoff}
      {agentSquadStatus.lastHandoff.fromAgentId} → {agentSquadStatus.lastHandoff
        .targetAgentId}: {agentSquadStatus.lastHandoff.summary ??
        agentSquadStatus.lastHandoff.reason ??
        "handoff applied"}
    {:else}
      No specialist handoff in this session yet.
    {/if}
  </p>
  <p class="voice-footnote">
    <a href="/agent-squad-contract">Open squad contract proof</a>
  </p>
</article>
