import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  VOICE_MODEL_PROVIDERS,
  VOICE_PROFILES,
  VOICE_ROUTING_MODES,
  VOICE_SPEECH_ENGINES,
} from "../../../../constants/voiceOptions";
import type {
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceSpeechEngine,
} from "../../../../types/voice";

@Component({
  host: {
    class: "voice-card voice-provider-card",
  },
  selector: "article[voiceProviderConfigCard]",
  standalone: true,
  templateUrl: "./provider-config-card.html",
})
export class ProviderConfigCardComponent {
  @Input({ required: true }) modelProvider!: VoiceModelProvider;
  @Input({ required: true }) profileId!: VoiceProfileId;
  @Input({ required: true }) routingDescription!: string;
  @Input({ required: true }) routingMode!: VoiceRoutingMode;
  @Input({ required: true }) speechEngine!: VoiceSpeechEngine;
  @Output() modelProviderChange = new EventEmitter<VoiceModelProvider>();
  @Output() profileIdChange = new EventEmitter<VoiceProfileId>();
  @Output() routingModeChange = new EventEmitter<VoiceRoutingMode>();
  @Output() speechEngineChange = new EventEmitter<VoiceSpeechEngine>();
  modelProviders = VOICE_MODEL_PROVIDERS;
  routingModes = VOICE_ROUTING_MODES;
  speechEngines = VOICE_SPEECH_ENGINES;
  voiceProfiles = VOICE_PROFILES;
}
