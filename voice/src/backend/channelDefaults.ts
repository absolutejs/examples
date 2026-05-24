import type {
  VoiceRouteResult,
  VoiceSessionHandle,
  VoiceSessionRecord,
  VoiceTurnRecord,
} from "@absolutejs/voice";
import type { SavedIntake } from "../types/domain";
import {
  VOICE_EVIDENCE_TOPIC,
  VOICE_TURN_TOPIC,
  voiceAgentSquadTopic,
} from "../constants/sync";
import { VOICE_DEMO_PHRASE_HINTS, buildSavedIntake } from "./voiceFlow";
import { correctDemoTurn } from "./agentSquad";
import { handoffAdapters } from "./carrierHandoff";
import { persistIntake } from "./contracts";
import { createDemoProfileSwitchGuard } from "./observabilityExport";
import { assistant, liveOpsRuntime } from "./profileSwitch";
import { contractAwareOnTurn } from "./proofSuite";
import { rememberSessionRoutingMode } from "./providers";
import { reactiveHub } from "./sync";
import { handoffDeliveryStore, sessionStore } from "./stores";

// Wrap the contract-aware turn handler to push the live agent-squad status to
// any subscribed dashboards after each committed turn. Keep the positional
// (session, turn, api, context) arity so the runtime's normalizeOnTurn still
// treats it as a direct handler — collapsing it to a single object arg silently
// drops the turn (see proofSuite.ts contractAwareOnTurn note). contractAwareOnTurn
// is typed as the positional|object union, so call it through the direct shape.
type DirectContractTurn = (
  session: VoiceSessionRecord,
  turn: VoiceTurnRecord,
  api: VoiceSessionHandle<unknown, VoiceSessionRecord, SavedIntake>,
  context: unknown,
) =>
  | Promise<VoiceRouteResult<SavedIntake> | void>
  | VoiceRouteResult<SavedIntake>
  | void;

const onTurnWithSquadPush: DirectContractTurn = async (
  session,
  turn,
  api,
  context,
) => {
  const result = await (contractAwareOnTurn as DirectContractTurn)(
    session,
    turn,
    api,
    context,
  );
  // A committed turn moves the live-call surfaces, grows the evidence corpus,
  // and updates this session's agent-squad status. Push all three so subscribed
  // dashboards refetch instead of polling.
  reactiveHub.publish(VOICE_TURN_TOPIC);
  reactiveHub.publish(VOICE_EVIDENCE_TOPIC);
  reactiveHub.publish(voiceAgentSquadTopic(session.id));

  return result;
};

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
  onTurn: onTurnWithSquadPush,
  ops: assistant.ops,
  preset: "reliability" as const,
  profileSwitchGuard: createDemoProfileSwitchGuard(channelPath),
  session: sessionStore,
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
