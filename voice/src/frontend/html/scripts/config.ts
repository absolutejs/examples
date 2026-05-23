import { reloadWithVoiceSearchParam } from "../../../shared/browser";
import {
  rememberVoiceModelProvider,
  rememberVoiceProfileId,
  rememberVoiceRoutingMode,
  rememberVoiceSpeechEngine,
} from "../../../shared/demo";
import type {
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceSpeechEngine,
} from "../../../types/voice";

type ConfigControlsInput = {
  modelProviderSelect: HTMLSelectElement;
  onBeforeReload: () => void;
  onSpeechEngineChange: (engine: VoiceSpeechEngine) => void;
  routingModeSelect: HTMLSelectElement;
  speechEngineSelect: HTMLSelectElement;
  voiceProfileSelect: HTMLSelectElement;
};

export const wireConfigControls = (input: ConfigControlsInput) => {
  const {
    modelProviderSelect,
    onBeforeReload,
    onSpeechEngineChange,
    routingModeSelect,
    speechEngineSelect,
    voiceProfileSelect,
  } = input;

  modelProviderSelect.addEventListener("change", () => {
    onBeforeReload();
    rememberVoiceModelProvider(modelProviderSelect.value as VoiceModelProvider);
    reloadWithVoiceSearchParam("provider", modelProviderSelect.value);
  });

  voiceProfileSelect.addEventListener("change", () => {
    onBeforeReload();
    rememberVoiceProfileId(voiceProfileSelect.value as VoiceProfileId);
    reloadWithVoiceSearchParam("voiceProfile", voiceProfileSelect.value);
  });

  routingModeSelect.addEventListener("change", () => {
    onBeforeReload();
    rememberVoiceRoutingMode(routingModeSelect.value as VoiceRoutingMode);
    reloadWithVoiceSearchParam("routing", routingModeSelect.value);
  });

  speechEngineSelect.addEventListener("change", () => {
    onBeforeReload();
    const nextEngine = speechEngineSelect.value as VoiceSpeechEngine;
    onSpeechEngineChange(nextEngine);
    rememberVoiceSpeechEngine(nextEngine);
    reloadWithVoiceSearchParam("engine", nextEngine);
  });
};
