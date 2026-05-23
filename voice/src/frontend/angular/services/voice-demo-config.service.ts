import { Injectable } from "@angular/core";
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
import { reloadWithVoiceSearchParam } from "../../../shared/browser";

@Injectable({ providedIn: "root" })
export class VoiceDemoConfigService {
  applyModelProvider(provider: VoiceModelProvider) {
    rememberVoiceModelProvider(provider);
    reloadWithVoiceSearchParam("provider", provider);
  }

  applyProfileId(profileId: VoiceProfileId) {
    rememberVoiceProfileId(profileId);
    reloadWithVoiceSearchParam("voiceProfile", profileId);
  }

  applyRoutingMode(routing: VoiceRoutingMode) {
    rememberVoiceRoutingMode(routing);
    reloadWithVoiceSearchParam("routing", routing);
  }

  applySpeechEngine(engine: VoiceSpeechEngine) {
    rememberVoiceSpeechEngine(engine);
    reloadWithVoiceSearchParam("engine", engine);
  }
}
