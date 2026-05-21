import { type SavedIntake } from "../shared/demo";
import { VOICE_DEMO_PHRASE_HINTS, buildSavedIntake } from "./voiceFlow";
import { type VoiceSessionRecord, voice } from "@absolutejs/voice";

import { Elysia } from "elysia";

import { correctDemoTurn } from "./agentSquad";
import { handoffAdapters } from "./carrierHandoff";
import { persistIntake } from "./contracts";

import { createDemoProfileSwitchGuard } from "./observabilityExport";
import { assistant, liveOpsRuntime, openAIRealtime } from "./profileSwitch";

import { contractAwareOnTurn } from "./proofSuite";
import {
  deliveryTraceStore,
  realtimeChannelFormat,
  rememberSessionRoutingMode,
} from "./providers";

import { handoffDeliveryStore, runtimeStorage } from "./stores";

export const realtimeVoicePlugin = openAIRealtime
  ? voice<unknown, VoiceSessionRecord, SavedIntake>({
      correctTurn: correctDemoTurn,
      handoff:
        handoffAdapters.length > 0
          ? {
              adapters: handoffAdapters,
              deliveryQueue: handoffDeliveryStore,
            }
          : undefined,
      onComplete: async ({ session }) => {
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
      path: "/voice/realtime",
      phraseHints: async (input) => {
        await rememberSessionRoutingMode(input);
        return VOICE_DEMO_PHRASE_HINTS;
      },
      profileSwitchGuard: createDemoProfileSwitchGuard("/voice/realtime"),
      preset: "reliability",
      realtime: openAIRealtime,
      realtimeInputFormat: realtimeChannelFormat,
      session: runtimeStorage.session,
      trace: deliveryTraceStore,
      liveOps: liveOpsRuntime,
    })
  : new Elysia();
