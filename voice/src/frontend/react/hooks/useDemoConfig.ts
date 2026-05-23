import { useState } from "react";
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

export const useDemoConfig = (input: DemoConfigInput) => {
  const [modelProvider] = useState<VoiceModelProvider>(
    input.initialModelProvider,
  );
  const [profileId] = useState<VoiceProfileId>(input.initialProfileId);
  const [routingMode] = useState<VoiceRoutingMode>(input.initialRoutingMode);
  const [speechEngine] = useState<VoiceSpeechEngine>(input.initialSpeechEngine);

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

  return {
    changeModelProvider,
    changeProfileId,
    changeRoutingMode,
    changeSpeechEngine,
    modelProvider,
    profileId,
    routingMode,
    speechEngine,
  };
};
