import {
  fetchAgentSquadDemoStatus,
  fetchSavedIntakes,
} from "../../shared/browser";
import type { VoiceStreamState } from "@absolutejs/voice";
import type {
  SavedIntake,
  VoiceAgentSquadDemoStatus,
} from "../../../shared/demo";

const REFRESH_INTERVAL_MS = 4_000;

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

export const useSavedIntakes = (input: SavedIntakesInput): SavedIntakes => {
  let savedIntakes = $state<SavedIntake[]>([]);
  let agentSquadStatus = $state<VoiceAgentSquadDemoStatus | null>(null);
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

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
    refreshTimer = setInterval(() => {
      void refreshIntakes();
      void refreshAgentSquadStatus();
    }, REFRESH_INTERVAL_MS);
  };

  const stop = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  };

  return {
    get agentSquadStatus() {
      return agentSquadStatus;
    },
    refreshAgentSquadStatus,
    refreshIntakes,
    get savedIntakes() {
      return savedIntakes;
    },
    start,
    stop,
  };
};
