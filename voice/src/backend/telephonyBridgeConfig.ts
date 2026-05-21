import { channelDefaults } from "./channelDefaults";
import { sttAdapter, telephonyTTS } from "./realCallEvidence";

export const createTelephonyBridgeConfig = () => ({
  ...channelDefaults("/voice/telephony"),
  context: {},
  stt: sttAdapter,
  tts: telephonyTTS,
});
