<script setup lang="ts">
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

defineProps<ProviderConfigCardProps>();
</script>

<template>
  <article class="voice-card voice-provider-card">
    <span class="voice-framework-pill">Model Provider</span>
    <h2>Choose the assistant brain</h2>
    <p class="voice-footnote">
      Switch providers before starting the microphone. The voice route receives
      the selected provider on every session.
    </p>
    <label class="voice-provider-select">
      <span>Provider</span>
      <select :value="modelProvider" @change="onChangeModelProvider">
        <option
          v-for="provider in VOICE_MODEL_PROVIDERS"
          :key="provider.id"
          :value="provider.id"
        >
          {{ provider.label }}
        </option>
      </select>
    </label>
    <label class="voice-provider-select">
      <span>Voice profile</span>
      <select :value="profileId" @change="onChangeProfileId">
        <option
          v-for="profile in VOICE_PROFILES"
          :key="profile.id"
          :value="profile.id"
        >
          {{ profile.label }}
        </option>
      </select>
    </label>
    <label class="voice-provider-select">
      <span>STT routing</span>
      <select :value="routingMode" @change="onChangeRoutingMode">
        <option
          v-for="routing in VOICE_ROUTING_MODES"
          :key="routing.id"
          :value="routing.id"
        >
          {{ routing.label }}
        </option>
      </select>
    </label>
    <label class="voice-provider-select">
      <span>Speech engine</span>
      <select :value="speechEngine" @change="onChangeSpeechEngine">
        <option
          v-for="engine in VOICE_SPEECH_ENGINES"
          :key="engine.id"
          :value="engine.id"
        >
          {{ engine.label }}
        </option>
      </select>
    </label>
    <p class="voice-footnote">
      {{
        getVoiceProfileLabel(profileId) +
        " uses " +
        (VOICE_PROFILES.find((item) => item.id === profileId)?.description ??
          "the selected real-call defaults.")
      }}
    </p>
  </article>
</template>
