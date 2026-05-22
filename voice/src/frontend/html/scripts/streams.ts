import { createVoiceStream } from "@absolutejs/voice/client";
import {
  getVoiceRoutePath,
  type SavedIntake,
  type VoiceModelProvider,
  type VoiceProfileId,
  type VoiceRoutingMode,
  type VoiceSpeechEngine,
} from "../../../shared/demo";

export type VoiceDemoStream = ReturnType<typeof createVoiceStream<SavedIntake>>;

type DemoStreamsInput = {
  modelProvider: VoiceModelProvider;
  profileId: VoiceProfileId;
  routingMode: VoiceRoutingMode;
  speechEngine: VoiceSpeechEngine;
};

export const createDemoStreams = (input: DemoStreamsInput) => {
  const { modelProvider, profileId, routingMode, speechEngine } = input;
  const guidedVoice = createVoiceStream<SavedIntake>(
    getVoiceRoutePath(
      "guided",
      modelProvider,
      routingMode,
      speechEngine,
      profileId,
    ),
    { reconnectReportPath: "/api/voice/reconnect-traces" },
  );
  const generalVoice = createVoiceStream<SavedIntake>(
    getVoiceRoutePath(
      "general",
      modelProvider,
      routingMode,
      speechEngine,
      profileId,
    ),
    { reconnectReportPath: "/api/voice/reconnect-traces" },
  );

  return { generalVoice, guidedVoice };
};
