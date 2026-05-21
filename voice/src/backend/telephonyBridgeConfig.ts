import { type SavedIntake } from "../shared/demo";
import { VOICE_DEMO_PHRASE_HINTS, buildSavedIntake } from "./voiceFlow";
import { type VoiceSessionRecord, voice } from "@absolutejs/voice";

import { correctDemoTurn } from "./agentSquad";
import { handoffAdapters } from "./carrierHandoff";
import { persistIntake } from "./contracts";

import { createDemoProfileSwitchGuard } from "./observabilityExport";
import { assistant, liveOpsRuntime } from "./profileSwitch";

import { contractAwareOnTurn } from "./proofSuite";
import { rememberSessionRoutingMode } from "./providers";

import { sttAdapter, telephonyTTS } from "./realCallEvidence";

import { handoffDeliveryStore, runtimeStorage } from "./stores";

export const createTelephonyBridgeConfig = () => ({
  context: {},
  correctTurn: correctDemoTurn,
  handoff:
    handoffAdapters.length > 0
      ? {
          adapters: handoffAdapters,
          deliveryQueue: handoffDeliveryStore,
        }
      : undefined,
  onComplete: async ({ session }: { session: VoiceSessionRecord }) => {
    const result = session.turns
      .toReversed()
      .find((turn) => turn.result !== undefined)?.result as
      | SavedIntake
      | undefined;
    const savedIntake = result ?? buildSavedIntake(session);
    persistIntake(savedIntake);
  },
  onTurn: contractAwareOnTurn,
  ops: assistant.ops,
  phraseHints: async (input: { context: unknown; sessionId: string }) => {
    await rememberSessionRoutingMode(input);
    return VOICE_DEMO_PHRASE_HINTS;
  },
  profileSwitchGuard: createDemoProfileSwitchGuard("/voice/telephony"),
  preset: "reliability" as const,
  session: runtimeStorage.session,
  stt: sttAdapter,
  tts: telephonyTTS,
  liveOps: liveOpsRuntime,
});
