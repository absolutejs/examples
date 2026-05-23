import { Component, EventEmitter, Input, Output } from "@angular/core";
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

@Component({
  host: {
    class: "voice-card voice-provider-card",
  },
  selector: "article[voiceProviderConfigCard]",
  standalone: true,
  template: `
    <span class="voice-framework-pill">Model Provider</span>
    <h2>Choose the assistant brain</h2>
    <p class="voice-footnote">
      Switch providers before starting the microphone. The voice route receives
      the selected provider on every session.
    </p>
    <label class="voice-provider-select">
      <span>Provider</span>
      <select (change)="modelProviderChange.emit($any($event.target).value)">
        @for (provider of modelProviders; track provider.id) {
          <option
            value="{{ provider.id }}"
            [attr.selected]="provider.id === modelProvider ? '' : null"
          >
            {{ provider.label }}
          </option>
        }
      </select>
    </label>
    <label class="voice-provider-select">
      <span>Voice profile</span>
      <select (change)="profileIdChange.emit($any($event.target).value)">
        @for (profile of voiceProfiles; track profile.id) {
          <option
            value="{{ profile.id }}"
            [attr.selected]="profile.id === profileId ? '' : null"
          >
            {{ profile.label }}
          </option>
        }
      </select>
    </label>
    <label class="voice-provider-select">
      <span>STT routing</span>
      <select (change)="routingModeChange.emit($any($event.target).value)">
        @for (routing of routingModes; track routing.id) {
          <option
            value="{{ routing.id }}"
            [attr.selected]="routing.id === routingMode ? '' : null"
          >
            {{ routing.label }}
          </option>
        }
      </select>
    </label>
    <label class="voice-provider-select">
      <span>Speech engine</span>
      <select (change)="speechEngineChange.emit($any($event.target).value)">
        @for (engine of speechEngines; track engine.id) {
          <option
            value="{{ engine.id }}"
            [attr.selected]="engine.id === speechEngine ? '' : null"
          >
            {{ engine.label }}
          </option>
        }
      </select>
    </label>
    <p class="voice-footnote">
      {{ routingDescription }}
    </p>
  `,
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
