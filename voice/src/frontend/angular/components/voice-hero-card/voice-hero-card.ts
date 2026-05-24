import { Component, Input } from "@angular/core";
import {
  formatVoiceProfileSwitchGuardLabel,
  formatVoiceProfileSwitchGuardSummary,
  getVoiceModeLabel,
  getVoiceProviderLabel,
  getVoiceRoutingLabel,
} from "../../../../shared/demo";
import type {
  VoiceDemoMode,
  VoiceModelProvider,
  VoiceRoutingMode,
} from "../../../../types/voice";
import type { VoiceProfileSwitchGuardClientDecision } from "../../../../types/domain";

@Component({
  host: {
    class: "voice-card voice-hero",
  },
  selector: "article[voiceHeroCard]",
  standalone: true,
  templateUrl: "./voice-hero-card.html",
})
export class VoiceHeroCardComponent {
  @Input({ required: true }) activeMode!: VoiceDemoMode | null;
  @Input({ required: true }) description!: string;
  @Input({ required: true }) isConnected!: boolean;
  @Input({ required: true }) modelProvider!: VoiceModelProvider;
  @Input({ required: true })
  profileSwitchGuardDecision!: VoiceProfileSwitchGuardClientDecision | null;
  @Input({ required: true }) routingMode!: VoiceRoutingMode;
  @Input({ required: true }) savedIntakesCount!: number;
  formatVoiceProfileSwitchGuardLabel = formatVoiceProfileSwitchGuardLabel;
  formatVoiceProfileSwitchGuardSummary = formatVoiceProfileSwitchGuardSummary;
  getVoiceModeLabel = getVoiceModeLabel;
  getVoiceProviderLabel = getVoiceProviderLabel;
  getVoiceRoutingLabel = getVoiceRoutingLabel;
}
