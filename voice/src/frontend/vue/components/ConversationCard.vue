<script setup lang="ts">
import type {
  VoiceReconnectClientState,
  VoiceSessionStatus,
  VoiceTurnRecord,
} from "@absolutejs/voice";
import { formatReconnectState } from "../../shared/browser";
import {
  getVoiceModeLabel,
  VOICE_CALL_CONTROL_ACTIONS,
  VOICE_DEMO_GENERAL_LABEL,
  VOICE_DEMO_GUIDED_LABEL,
  VOICE_DEMO_MIC_IDLE,
  VOICE_DEMO_MIC_LIVE,
  VOICE_DEMO_STOP_LABEL,
  type SavedIntake,
  type VoiceDemoMode,
} from "../../../shared/demo";

type ConversationCardProps = {
  activeMode: VoiceDemoMode | null;
  callLifecycleLabel: string;
  currentPrompt: string;
  errorMessage: string;
  isCapturing: boolean;
  leadMessage: string;
  onRunCallControl: (
    action: (typeof VOICE_CALL_CONTROL_ACTIONS)[number],
  ) => void;
  onStartMode: (mode: VoiceDemoMode) => void;
  onStopMic: () => void;
  partial: string;
  reconnect: VoiceReconnectClientState;
  status: VoiceSessionStatus | "idle";
  turns: VoiceTurnRecord<SavedIntake>[];
  wavePath: string;
};

defineProps<ConversationCardProps>();
</script>

<template>
  <article class="voice-card voice-card-wide">
    <h2>Conversation</h2>
    <div class="voice-status-list">
      <div class="status-row">
        <span class="label">Voice status</span>
        <span class="value">{{ status }}</span>
      </div>
      <div class="status-row">
        <span class="label">Reconnect</span>
        <span class="value">{{ formatReconnectState(reconnect) }}</span>
      </div>
      <div class="status-row">
        <span class="label">Current prompt</span>
        <span class="value">{{ currentPrompt }}</span>
      </div>
      <div class="status-row">
        <span class="label">Microphone</span>
        <span class="value">{{
          isCapturing ? VOICE_DEMO_MIC_LIVE : VOICE_DEMO_MIC_IDLE
        }}</span>
      </div>
      <div class="status-row">
        <span class="label">Current utterance</span>
        <span class="value">
          {{ partial || "No speech captured yet" }}
        </span>
      </div>
      <div class="status-row">
        <span class="label">Errors</span>
        <span class="value">{{ errorMessage }}</span>
      </div>
      <div class="status-row">
        <span class="label">Call lifecycle</span>
        <span class="value">{{ callLifecycleLabel }}</span>
      </div>
    </div>
    <div class="voice-chat-list">
      <article class="voice-chat-message assistant">
        <div class="voice-chat-role">
          {{ activeMode ? getVoiceModeLabel(activeMode) : "Voice demo" }}
        </div>
        <p class="voice-turn-text">{{ leadMessage }}</p>
      </article>
      <div v-for="turn in turns" :key="turn.id" class="voice-chat-stack">
        <article class="voice-chat-message user">
          <div class="voice-chat-role">You</div>
          <p class="voice-turn-text">{{ turn.text }}</p>
        </article>
        <article
          v-if="turn.assistantText"
          class="voice-chat-message assistant"
        >
          <div class="voice-chat-role">
            {{ activeMode ? getVoiceModeLabel(activeMode) : "Guide" }}
          </div>
          <p class="voice-turn-text">{{ turn.assistantText }}</p>
        </article>
      </div>
      <article v-if="partial" class="voice-chat-message user pending">
        <div class="voice-chat-role">Speaking</div>
        <p class="voice-turn-text">{{ partial }}</p>
      </article>
    </div>
    <div :class="['voice-monitor', { 'is-live': isCapturing }]">
      <div class="voice-monitor-header">
        <span class="voice-monitor-label">Input monitor</span>
        <span :class="['voice-live-pill', { 'is-live': isCapturing }]">
          <span class="voice-live-dot"></span>
          {{ isCapturing ? "Microphone live" : "Microphone idle" }}
        </span>
      </div>
      <svg
        aria-label="Microphone waveform"
        class="voice-wave"
        viewBox="0 0 320 88"
      >
        <path class="voice-wave-baseline" d="M 0 44 L 320 44" />
        <path class="voice-wave-glow" :d="wavePath" />
        <path class="voice-wave-line" :d="wavePath" />
      </svg>
    </div>
    <div class="voice-actions">
      <template v-if="isCapturing">
        <button class="primary" @click="onStopMic">
          {{ VOICE_DEMO_STOP_LABEL }}
        </button>
      </template>
      <template v-else>
        <button class="primary" @click="onStartMode('guided')">
          {{ VOICE_DEMO_GUIDED_LABEL }}
        </button>
        <button @click="onStartMode('general')">
          {{ VOICE_DEMO_GENERAL_LABEL }}
        </button>
      </template>
    </div>
    <div class="voice-actions">
      <button
        v-for="action in VOICE_CALL_CONTROL_ACTIONS"
        :key="action.action"
        type="button"
        @click="onRunCallControl(action)"
      >
        {{ action.label }}
      </button>
    </div>
    <p class="voice-footnote">
      This demo uses the dev-only in-memory voice session store. Real
      deployments should replace it with Redis or Postgres.
    </p>
  </article>
</template>
