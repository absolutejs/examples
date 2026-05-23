import { Component, EventEmitter, Input, Output } from "@angular/core";
import type {
  VoiceReconnectClientState,
  VoiceSessionStatus,
  VoiceTurnRecord,
} from "@absolutejs/voice";
import { VOICE_CALL_CONTROL_ACTIONS } from "../../../constants/demoActions";
import { getVoiceModeLabel } from "../../../shared/demo";
import type { SavedIntake } from "../../../types/domain";
import type { VoiceDemoMode } from "../../../types/voice";
import { formatReconnectState } from "../../../shared/browser";

type CallControlAction = (typeof VOICE_CALL_CONTROL_ACTIONS)[number];

@Component({
  host: {
    class: "voice-card voice-card-wide",
  },
  selector: "article[voiceConversationCard]",
  standalone: true,
  template: `
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
        <span class="value">{{ isCapturing ? liveMicCopy : idleMicCopy }}</span>
      </div>
      <div class="status-row">
        <span class="label">Current utterance</span>
        <span class="value">{{ partial || "No speech captured yet" }}</span>
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
      @for (turn of turns; track turn.id) {
        <div class="voice-chat-stack">
          <article class="voice-chat-message user">
            <div class="voice-chat-role">You</div>
            <p class="voice-turn-text">{{ turn.text }}</p>
          </article>
          @if (turn.assistantText) {
            <article class="voice-chat-message assistant">
              <div class="voice-chat-role">
                {{ activeMode ? getVoiceModeLabel(activeMode) : "Guide" }}
              </div>
              <p class="voice-turn-text">{{ turn.assistantText }}</p>
            </article>
          }
        </div>
      }
      @if (partial) {
        <article class="voice-chat-message user pending">
          <div class="voice-chat-role">Speaking</div>
          <p class="voice-turn-text">{{ partial }}</p>
        </article>
      }
    </div>
    <div class="voice-monitor" [class.is-live]="isCapturing">
      <div class="voice-monitor-header">
        <span class="voice-monitor-label">Input monitor</span>
        <span class="voice-live-pill" [class.is-live]="isCapturing">
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
        <path class="voice-wave-glow" [attr.d]="wavePath" />
        <path class="voice-wave-line" [attr.d]="wavePath" />
      </svg>
    </div>
    <div class="voice-actions">
      @if (isCapturing) {
        <button class="primary" type="button" (click)="stopMic.emit()">
          {{ stopLabel }}
        </button>
      } @else {
        <button
          class="primary"
          type="button"
          (click)="startMode.emit('guided')"
        >
          {{ guidedLabel }}
        </button>
        <button type="button" (click)="startMode.emit('general')">
          {{ generalLabel }}
        </button>
      }
    </div>
    <div class="voice-actions">
      @for (action of callControlActions; track action.action) {
        <button type="button" (click)="runCallControl.emit(action)">
          {{ action.label }}
        </button>
      }
    </div>
    <p class="voice-footnote">
      This demo uses the dev-only in-memory voice session store. Real
      deployments should replace it with Redis or Postgres.
    </p>
  `,
})
export class ConversationCardComponent {
  @Input({ required: true }) activeMode!: VoiceDemoMode | null;
  @Input({ required: true })
  callControlActions!: typeof VOICE_CALL_CONTROL_ACTIONS;
  @Input({ required: true }) callLifecycleLabel!: string;
  @Input({ required: true }) currentPrompt!: string;
  @Input({ required: true }) errorMessage!: string;
  @Input({ required: true }) generalLabel!: string;
  @Input({ required: true }) guidedLabel!: string;
  @Input({ required: true }) idleMicCopy!: string;
  @Input({ required: true }) isCapturing!: boolean;
  @Input({ required: true }) leadMessage!: string;
  @Input({ required: true }) liveMicCopy!: string;
  @Input({ required: true }) partial!: string;
  @Input({ required: true }) reconnect!: VoiceReconnectClientState;
  @Input({ required: true }) status!: VoiceSessionStatus | "idle";
  @Input({ required: true }) stopLabel!: string;
  @Input({ required: true }) turns!: VoiceTurnRecord<SavedIntake>[];
  @Input({ required: true }) wavePath!: string;
  @Output() runCallControl = new EventEmitter<CallControlAction>();
  @Output() startMode = new EventEmitter<VoiceDemoMode>();
  @Output() stopMic = new EventEmitter<void>();
  formatReconnectState = formatReconnectState;
  getVoiceModeLabel = getVoiceModeLabel;
}
