import { createSyncSubscriber } from "@absolutejs/sync/client";
import {
  fetchAgentSquadDemoStatus,
  fetchSavedIntakes,
} from "../../../shared/browser";
import {
  VOICE_INTAKES_TOPIC,
  VOICE_SYNC_PATH,
  VOICE_TURN_TOPIC,
} from "../../../constants/sync";
import type { VoiceStreamState } from "@absolutejs/voice";
import type {
  SavedIntake,
  VoiceAgentSquadDemoStatus,
} from "../../../types/domain";

type SavedIntakesInput = {
  getCurrentVoice: () => VoiceStreamState<SavedIntake>;
};

type SavedIntakes = {
  readonly agentSquadStatus: VoiceAgentSquadDemoStatus | null;
  refreshAgentSquadStatus: () => Promise<void>;
  refreshIntakes: () => Promise<void>;
  readonly savedIntakes: SavedIntake[];
  start: () => void;
  stop: () => void;
};

// Reactive instead of polled: load once, then refetch only when the server
// pushes the relevant topic over @absolutejs/sync's SSE stream. Saved intakes
// follow VOICE_INTAKES_TOPIC; agent-squad status advances per committed turn,
// so it follows VOICE_TURN_TOPIC (the session id is read fresh on each refresh).
// No 4s timer.
export const useSavedIntakes = (input: SavedIntakesInput): SavedIntakes => {
  let savedIntakes = $state<SavedIntake[]>([]);
  let agentSquadStatus = $state<VoiceAgentSquadDemoStatus | null>(null);
  let intakesSubscriber: ReturnType<typeof createSyncSubscriber> | null = null;
  let agentSquadSubscriber: ReturnType<typeof createSyncSubscriber> | null =
    null;

  const refreshIntakes = async () => {
    savedIntakes = await fetchSavedIntakes();
  };

  const refreshAgentSquadStatus = async () => {
    agentSquadStatus = await fetchAgentSquadDemoStatus(
      input.getCurrentVoice().sessionId ?? undefined,
    );
  };

  const start = () => {
    void refreshIntakes();
    void refreshAgentSquadStatus();
    intakesSubscriber = createSyncSubscriber({
      onEvent: () => void refreshIntakes(),
      topics: [VOICE_INTAKES_TOPIC],
      url: VOICE_SYNC_PATH,
    });
    agentSquadSubscriber = createSyncSubscriber({
      onEvent: () => void refreshAgentSquadStatus(),
      topics: [VOICE_TURN_TOPIC],
      url: VOICE_SYNC_PATH,
    });
  };

  const stop = () => {
    intakesSubscriber?.close();
    intakesSubscriber = null;
    agentSquadSubscriber?.close();
    agentSquadSubscriber = null;
  };

  return {
    refreshAgentSquadStatus,
    refreshIntakes,
    start,
    stop,
    get agentSquadStatus() {
      return agentSquadStatus;
    },
    get savedIntakes() {
      return savedIntakes;
    },
  };
};
