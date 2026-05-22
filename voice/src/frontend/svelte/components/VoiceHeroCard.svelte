<script lang="ts">
  import {
    FRAMEWORK_DESCRIPTIONS,
    formatVoiceProfileSwitchGuardLabel,
    formatVoiceProfileSwitchGuardSummary,
    getVoiceModeLabel,
    getVoiceProviderLabel,
    getVoiceRoutingLabel,
    type VoiceDemoMode,
    type VoiceModelProvider,
    type VoiceProfileSwitchGuardClientDecision,
    type VoiceRoutingMode,
  } from "../../../shared/demo";

  type VoiceHeroCardProps = {
    activeMode: VoiceDemoMode | null;
    isConnected: boolean;
    modelProvider: VoiceModelProvider;
    profileSwitchGuardDecision: VoiceProfileSwitchGuardClientDecision | null;
    routingMode: VoiceRoutingMode;
    savedIntakeCount: number;
  };

  let {
    activeMode,
    isConnected,
    modelProvider,
    profileSwitchGuardDecision,
    routingMode,
    savedIntakeCount,
  }: VoiceHeroCardProps = $props();
</script>

<article class="voice-card voice-hero">
  <div class="voice-hero-layout">
    <div>
      <span class="voice-framework-pill">Svelte Entry Point</span>
      <h2>Chat-style voice demo in Svelte</h2>
      <p class="voice-brand-copy">{FRAMEWORK_DESCRIPTIONS.svelte}</p>
      <div class="voice-badges">
        <span class="voice-badge">Deepgram Flux</span>
        <span class="voice-badge">Phrase hint correction</span>
        <span class="voice-badge">Reconnect-aware sessions</span>
      </div>
    </div>
    <div class="voice-metrics">
      <div class="voice-metric">
        <span class="voice-metric-label">Connection</span>
        <span class="voice-metric-value"
          >{isConnected ? "Connected" : "Waiting"}</span
        >
      </div>
      <div class="voice-metric">
        <span class="voice-metric-label">Scenario</span>
        <span class="voice-metric-value">
          {activeMode ? getVoiceModeLabel(activeMode) : "Choose one"}
        </span>
      </div>
      <div class="voice-metric">
        <span class="voice-metric-label">Saved captures</span>
        <span class="voice-metric-value">{savedIntakeCount}</span>
      </div>
      <div class="voice-metric">
        <span class="voice-metric-label">Model</span>
        <span class="voice-metric-value"
          >{getVoiceProviderLabel(modelProvider)}</span
        >
      </div>
      <div class="voice-metric">
        <span class="voice-metric-label">Routing</span>
        <span class="voice-metric-value"
          >{getVoiceRoutingLabel(routingMode)}</span
        >
      </div>
      <div class="voice-metric">
        <span class="voice-metric-label">Guarded profile</span>
        <span class="voice-metric-value">
          {formatVoiceProfileSwitchGuardLabel(profileSwitchGuardDecision)}
        </span>
        <span class="voice-metric-label">
          {formatVoiceProfileSwitchGuardSummary(profileSwitchGuardDecision)}
        </span>
      </div>
    </div>
  </div>
</article>
