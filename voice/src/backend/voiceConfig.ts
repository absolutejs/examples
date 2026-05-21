import {
  createVoiceConfiguration,
  type VoiceSessionRecord,
} from "@absolutejs/voice";
import { type SavedIntake } from "../shared/demo";
import { channelDefaults } from "./channelDefaults";
import { sttAdapter } from "./realCallEvidence";
import { renderSavedIntakeHtmx } from "./savedIntakeHtmx";
import { voiceSurfaces } from "./voiceSurfaces";

export const voiceConfig = createVoiceConfiguration<
  unknown,
  VoiceSessionRecord,
  SavedIntake
>({
  ...channelDefaults("/voice/intake"),
  path: "/voice/intake",
  stt: sttAdapter,
  htmx: renderSavedIntakeHtmx,
  ...voiceSurfaces,
});
