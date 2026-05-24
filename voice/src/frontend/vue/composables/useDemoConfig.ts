import { type Ref, ref } from "vue";
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

type DemoConfigInput = {
  initialModelProvider: VoiceModelProvider;
  initialProfileId: VoiceProfileId;
  initialRoutingMode: VoiceRoutingMode;
  initialSpeechEngine: VoiceSpeechEngine;
  onBeforeReload: () => void;
};

type DemoConfig = {
  changeModelProvider: (provider: VoiceModelProvider) => void;
  changeModelProviderFromEvent: (event: Event) => void;
  changeProfileId: (nextProfileId: VoiceProfileId) => void;
  changeProfileIdFromEvent: (event: Event) => void;
  changeRoutingMode: (routing: VoiceRoutingMode) => void;
  changeRoutingModeFromEvent: (event: Event) => void;
  changeSpeechEngine: (engine: VoiceSpeechEngine) => void;
  changeSpeechEngineFromEvent: (event: Event) => void;
  modelProvider: Ref<VoiceModelProvider>;
  profileId: Ref<VoiceProfileId>;
  routingMode: Ref<VoiceRoutingMode>;
  speechEngine: Ref<VoiceSpeechEngine>;
};

export const useDemoConfig = (input: DemoConfigInput): DemoConfig => {
  const modelProvider = ref<VoiceModelProvider>(input.initialModelProvider);
  const profileId = ref<VoiceProfileId>(input.initialProfileId);
  const routingMode = ref<VoiceRoutingMode>(input.initialRoutingMode);
  const speechEngine = ref<VoiceSpeechEngine>(input.initialSpeechEngine);

  const changeModelProvider = (provider: VoiceModelProvider) => {
    input.onBeforeReload();
    rememberVoiceModelProvider(provider);
    reloadWithVoiceSearchParam("provider", provider);
  };

  const changeProfileId = (nextProfileId: VoiceProfileId) => {
    input.onBeforeReload();
    rememberVoiceProfileId(nextProfileId);
    reloadWithVoiceSearchParam("voiceProfile", nextProfileId);
  };

  const changeRoutingMode = (routing: VoiceRoutingMode) => {
    input.onBeforeReload();
    rememberVoiceRoutingMode(routing);
    reloadWithVoiceSearchParam("routing", routing);
  };

  const changeSpeechEngine = (engine: VoiceSpeechEngine) => {
    input.onBeforeReload();
    rememberVoiceSpeechEngine(engine);
    reloadWithVoiceSearchParam("engine", engine);
  };

  const changeModelProviderFromEvent = (event: Event) => {
    const { target } = event;
    if (target instanceof HTMLSelectElement) {
      changeModelProvider(target.value as VoiceModelProvider);
    }
  };

  const changeProfileIdFromEvent = (event: Event) => {
    const { target } = event;
    if (target instanceof HTMLSelectElement) {
      changeProfileId(target.value as VoiceProfileId);
    }
  };

  const changeRoutingModeFromEvent = (event: Event) => {
    const { target } = event;
    if (target instanceof HTMLSelectElement) {
      changeRoutingMode(target.value as VoiceRoutingMode);
    }
  };

  const changeSpeechEngineFromEvent = (event: Event) => {
    const { target } = event;
    if (target instanceof HTMLSelectElement) {
      changeSpeechEngine(target.value as VoiceSpeechEngine);
    }
  };

  return {
    changeModelProvider,
    changeModelProviderFromEvent,
    changeProfileId,
    changeProfileIdFromEvent,
    changeRoutingMode,
    changeRoutingModeFromEvent,
    changeSpeechEngine,
    changeSpeechEngineFromEvent,
    modelProvider,
    profileId,
    routingMode,
    speechEngine,
  };
};
