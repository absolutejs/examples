import { Component, EventEmitter, Input, Output } from "@angular/core";
import type {
  VoiceReconnectClientState,
  VoiceSessionStatus,
  VoiceTurnRecord,
} from "@absolutejs/voice";
import { VOICE_CALL_CONTROL_ACTIONS } from "../../../../constants/demoActions";
import { getVoiceModeLabel } from "../../../../shared/demo";
import type { SavedIntake } from "../../../../types/domain";
import type { VoiceDemoMode } from "../../../../types/voice";
import { formatReconnectState } from "../../../../shared/browser";

type CallControlAction = (typeof VOICE_CALL_CONTROL_ACTIONS)[number];

@Component({
  host: {
    class: "voice-card voice-card-wide",
  },
  selector: "article[voiceConversationCard]",
  standalone: true,
  templateUrl: "./conversation-card.html",
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
