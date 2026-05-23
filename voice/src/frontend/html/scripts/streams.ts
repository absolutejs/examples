import { createVoiceStream } from "@absolutejs/voice/client";
import { getVoiceRoutePath } from "../../../shared/demo";
import type { SavedIntake } from "../../../types/domain";
import type {
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceSpeechEngine,
} from "../../../types/voice";

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
