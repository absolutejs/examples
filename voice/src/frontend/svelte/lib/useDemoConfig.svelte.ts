import { reloadWithVoiceSearchParam } from "../../shared/browser";
import {
  rememberVoiceModelProvider,
  rememberVoiceProfileId,
  rememberVoiceRoutingMode,
  rememberVoiceSpeechEngine,
  type VoiceModelProvider,
  type VoiceProfileId,
  type VoiceRoutingMode,
  type VoiceSpeechEngine,
} from "../../../shared/demo";

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
  readonly modelProvider: VoiceModelProvider;
  readonly profileId: VoiceProfileId;
  readonly routingMode: VoiceRoutingMode;
  readonly speechEngine: VoiceSpeechEngine;
};

export const useDemoConfig = (input: DemoConfigInput): DemoConfig => {
  const modelProvider = $state(input.initialModelProvider);
  const profileId = $state(input.initialProfileId);
  const routingMode = $state(input.initialRoutingMode);
  const speechEngine = $state(input.initialSpeechEngine);

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
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      changeModelProvider(target.value as VoiceModelProvider);
    }
  };

  const changeProfileIdFromEvent = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      changeProfileId(target.value as VoiceProfileId);
    }
  };

  const changeRoutingModeFromEvent = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      changeRoutingMode(target.value as VoiceRoutingMode);
    }
  };

  const changeSpeechEngineFromEvent = (event: Event) => {
    const target = event.target;
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
    get modelProvider() {
      return modelProvider;
    },
    get profileId() {
      return profileId;
    },
    get routingMode() {
      return routingMode;
    },
    get speechEngine() {
      return speechEngine;
    },
  };
};
