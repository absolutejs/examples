import { type VoiceSessionRecord, voice } from "@absolutejs/voice";
import { Elysia } from "elysia";
import type { SavedIntake } from "../types/domain";
import { channelDefaults } from "./channelDefaults";
import { openAIRealtime } from "./profileSwitch";
import { deliveryTraceStore, realtimeChannelFormat } from "./providers";

export const realtimeVoicePlugin = openAIRealtime
  ? voice<unknown, VoiceSessionRecord, SavedIntake>({
      ...channelDefaults("/voice/realtime"),
      path: "/voice/realtime",
      realtime: openAIRealtime,
      realtimeInputFormat: realtimeChannelFormat,
      trace: deliveryTraceStore,
    })
  : new Elysia();
