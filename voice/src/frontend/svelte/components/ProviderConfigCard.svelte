<script lang="ts">
  import { getVoiceProfileLabel } from "../../../shared/demo";
  import {
    VOICE_MODEL_PROVIDERS,
    VOICE_PROFILES,
    VOICE_ROUTING_MODES,
    VOICE_SPEECH_ENGINES,
  } from "../../../constants/voiceOptions";
  import type {
    VoiceModelProvider,
    VoiceProfileId,
    VoiceRoutingMode,
    VoiceSpeechEngine,
  } from "../../../types/voice";

  type ProviderConfigCardProps = {
    modelProvider: VoiceModelProvider;
    onChangeModelProvider: (event: Event) => void;
    onChangeProfileId: (event: Event) => void;
    onChangeRoutingMode: (event: Event) => void;
    onChangeSpeechEngine: (event: Event) => void;
    profileId: VoiceProfileId;
    routingMode: VoiceRoutingMode;
    speechEngine: VoiceSpeechEngine;
  };

  let {
    modelProvider,
    onChangeModelProvider,
    onChangeProfileId,
    onChangeRoutingMode,
    onChangeSpeechEngine,
    profileId,
    routingMode,
    speechEngine,
  }: ProviderConfigCardProps = $props();
</script>

<article class="voice-card voice-provider-card">
  <span class="voice-framework-pill">Model Provider</span>
  <h2>Choose the assistant brain</h2>
  <p class="voice-footnote">
    Switch providers before starting the microphone. The voice route receives
    the selected provider on every session.
  </p>
  <label class="voice-provider-select">
    <span>Provider</span>
    <select value={modelProvider} on:change={onChangeModelProvider}>
      {#each VOICE_MODEL_PROVIDERS as provider}
        <option value={provider.id}>{provider.label}</option>
      {/each}
    </select>
  </label>
  <label class="voice-provider-select">
    <span>Voice profile</span>
    <select value={profileId} on:change={onChangeProfileId}>
      {#each VOICE_PROFILES as profile}
        <option value={profile.id}>{profile.label}</option>
      {/each}
    </select>
  </label>
  <label class="voice-provider-select">
    <span>STT routing</span>
    <select value={routingMode} on:change={onChangeRoutingMode}>
      {#each VOICE_ROUTING_MODES as routing}
        <option value={routing.id}>{routing.label}</option>
      {/each}
    </select>
  </label>
  <label class="voice-provider-select">
    <span>Speech engine</span>
    <select value={speechEngine} on:change={onChangeSpeechEngine}>
      {#each VOICE_SPEECH_ENGINES as engine}
        <option value={engine.id}>{engine.label}</option>
      {/each}
    </select>
  </label>
  <p class="voice-footnote">
    {getVoiceProfileLabel(profileId)} uses {VOICE_PROFILES.find(
      (item) => item.id === profileId,
    )?.description ?? "the selected real-call defaults."}
  </p>
</article>
