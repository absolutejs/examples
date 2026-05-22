import { type ComputedRef, type Ref, ref } from "vue";
import {
  fetchAgentSquadDemoStatus,
  fetchSavedIntakes,
} from "../../shared/browser";
import type {
  SavedIntake,
  VoiceAgentSquadDemoStatus,
} from "../../../shared/demo";
import type { VueVoiceStream } from "./useVoiceDemoStreams";

type SavedIntakesInput = {
  currentVoice: ComputedRef<VueVoiceStream>;
};

type SavedIntakes = {
  agentSquadStatus: Ref<VoiceAgentSquadDemoStatus | null>;
  refreshAgentSquadStatus: () => Promise<void>;
  refreshIntakes: () => Promise<void>;
  savedIntakes: Ref<SavedIntake[]>;
};

export const useSavedIntakes = (input: SavedIntakesInput): SavedIntakes => {
  const savedIntakes = ref<SavedIntake[]>([]);
  const agentSquadStatus = ref<VoiceAgentSquadDemoStatus | null>(null);

  const refreshIntakes = async () => {
    savedIntakes.value = await fetchSavedIntakes();
  };

  const refreshAgentSquadStatus = async () => {
    agentSquadStatus.value = await fetchAgentSquadDemoStatus(
      input.currentVoice.value.sessionId.value || undefined,
    );
  };

  return {
    agentSquadStatus,
    refreshAgentSquadStatus,
    refreshIntakes,
    savedIntakes,
  };
};
