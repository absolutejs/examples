import { channelDefaults } from "./channelDefaults";
import { sttAdapter, ttsAdapter } from "./realCallEvidence";

export const createTelephonyBridgeConfig = () => ({
  ...channelDefaults("/voice/telephony"),
  context: {},
  stt: sttAdapter,
  tts: ttsAdapter,
});
