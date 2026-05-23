import type { VoiceSessionRecord } from "@absolutejs/voice";
import type { SavedIntake } from "../types/domain";
import { VOICE_DEMO_PHRASE_HINTS, buildSavedIntake } from "./voiceFlow";
import { correctDemoTurn } from "./agentSquad";
import { handoffAdapters } from "./carrierHandoff";
import { persistIntake } from "./contracts";
import { createDemoProfileSwitchGuard } from "./observabilityExport";
import { assistant, liveOpsRuntime } from "./profileSwitch";
import { contractAwareOnTurn } from "./proofSuite";
import { rememberSessionRoutingMode } from "./providers";
import { handoffDeliveryStore, runtimeStorage } from "./stores";

// Shared base config for every voice channel (intake, realtime, telephony
// bridge). Only the profile-switch guard path differs per channel; spread the
// result and add channel-specific keys (stt/tts/realtime/htmx/path) on top.
export const channelDefaults = (channelPath: string) => ({
  correctTurn: correctDemoTurn,
  handoff:
    handoffAdapters.length > 0
      ? {
          adapters: handoffAdapters,
          deliveryQueue: handoffDeliveryStore,
        }
      : undefined,
  liveOps: liveOpsRuntime,
  onTurn: contractAwareOnTurn,
  ops: assistant.ops,
  preset: "reliability" as const,
  profileSwitchGuard: createDemoProfileSwitchGuard(channelPath),
  session: runtimeStorage.session,
  onComplete: async ({ session }: { session: VoiceSessionRecord }) => {
    const result = session.turns
      .toReversed()
      .find((turn) => turn.result !== undefined)?.result as
      | SavedIntake
      | undefined;
    await persistIntake(result ?? buildSavedIntake(session));
  },
  phraseHints: async (input: { context: unknown; sessionId: string }) => {
    await rememberSessionRoutingMode(input);

    return VOICE_DEMO_PHRASE_HINTS;
  },
});
