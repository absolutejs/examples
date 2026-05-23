<script lang="ts">
  import type { VoiceStreamState } from "@absolutejs/voice";
  import { getVoiceModeLabel } from "../../../shared/demo";
  import { VOICE_CALL_CONTROL_ACTIONS } from "../../../constants/demoActions";
  import {
    VOICE_DEMO_GENERAL_LABEL,
    VOICE_DEMO_GUIDED_LABEL,
    VOICE_DEMO_MIC_IDLE,
    VOICE_DEMO_MIC_LIVE,
    VOICE_DEMO_STOP_LABEL,
  } from "../../../constants/demoCopy";
  import type { SavedIntake } from "../../../types/domain";
  import type { VoiceDemoMode } from "../../../types/voice";

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
    onStartMode: (mode: VoiceDemoMode) => Promise<void>;
    onStopMic: () => void;
    partial: string;
    reconnectLabel: string;
    status: VoiceStreamState<SavedIntake>["status"];
    turns: VoiceStreamState<SavedIntake>["turns"];
    wavePath: string;
  };

  let {
    activeMode,
    callLifecycleLabel,
    currentPrompt,
    errorMessage,
    isCapturing,
    leadMessage,
    onRunCallControl,
    onStartMode,
    onStopMic,
    partial,
    reconnectLabel,
    status,
    turns,
    wavePath,
  }: ConversationCardProps = $props();
</script>

<article class="voice-card voice-card-wide">
  <h2>Conversation</h2>
  <div class="voice-status-list">
    <div class="status-row">
      <span class="label">Voice status</span>
      <span class="value">{status}</span>
    </div>
    <div class="status-row">
      <span class="label">Reconnect</span>
      <span class="value">{reconnectLabel}</span>
    </div>
    <div class="status-row">
      <span class="label">Current prompt</span>
      <span class="value">{currentPrompt}</span>
    </div>
    <div class="status-row">
      <span class="label">Microphone</span>
      <span class="value">
        {isCapturing ? VOICE_DEMO_MIC_LIVE : VOICE_DEMO_MIC_IDLE}
      </span>
    </div>
    <div class="status-row">
      <span class="label">Current utterance</span>
      <span class="value">{partial || "No speech captured yet"}</span>
    </div>
    <div class="status-row">
      <span class="label">Errors</span>
      <span class="value">{errorMessage}</span>
    </div>
    <div class="status-row">
      <span class="label">Call lifecycle</span>
      <span class="value">{callLifecycleLabel}</span>
    </div>
  </div>
  <div class="voice-chat-list">
    <article class="voice-chat-message assistant">
      <div class="voice-chat-role">
        {activeMode ? getVoiceModeLabel(activeMode) : "Voice demo"}
      </div>
      <p class="voice-turn-text">{leadMessage}</p>
    </article>
    {#each turns as turn}
      <div class="voice-chat-stack">
        <article class="voice-chat-message user">
          <div class="voice-chat-role">You</div>
          <p class="voice-turn-text">{turn.text}</p>
        </article>
        {#if turn.assistantText}
          <article class="voice-chat-message assistant">
            <div class="voice-chat-role">
              {activeMode ? getVoiceModeLabel(activeMode) : "Guide"}
            </div>
            <p class="voice-turn-text">{turn.assistantText}</p>
          </article>
        {/if}
      </div>
    {/each}
    {#if partial}
      <article class="voice-chat-message user pending">
        <div class="voice-chat-role">Speaking</div>
        <p class="voice-turn-text">{partial}</p>
      </article>
    {/if}
  </div>
  <div class="voice-monitor" class:is-live={isCapturing}>
    <div class="voice-monitor-header">
      <span class="voice-monitor-label">Input monitor</span>
      <span class="voice-live-pill" class:is-live={isCapturing}>
        <span class="voice-live-dot"></span>
        {isCapturing ? "Microphone live" : "Microphone idle"}
      </span>
    </div>
    <svg
      aria-label="Microphone waveform"
      class="voice-wave"
      viewBox="0 0 320 88"
    >
      <path class="voice-wave-baseline" d="M 0 44 L 320 44" />
      <path class="voice-wave-glow" d={wavePath} />
      <path class="voice-wave-line" d={wavePath} />
    </svg>
  </div>
  <div class="voice-actions">
    {#if isCapturing}
      <button class="primary" on:click={onStopMic}>
        {VOICE_DEMO_STOP_LABEL}
      </button>
    {:else}
      <button class="primary" on:click={() => void onStartMode("guided")}>
        {VOICE_DEMO_GUIDED_LABEL}
      </button>
      <button on:click={() => void onStartMode("general")}>
        {VOICE_DEMO_GENERAL_LABEL}
      </button>
    {/if}
  </div>
  <div class="voice-actions">
    {#each VOICE_CALL_CONTROL_ACTIONS as action}
      <button type="button" on:click={() => onRunCallControl(action)}>
        {action.label}
      </button>
    {/each}
  </div>
  <p class="voice-footnote">
    This demo uses the dev-only in-memory voice session store. Real deployments
    should replace it with Redis or Postgres.
  </p>
</article>
