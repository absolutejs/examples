import { useEffect, useState } from "react";
import { createSyncSubscriber } from "@absolutejs/sync/client";
import {
  fetchAgentSquadDemoStatus,
  fetchVoiceRealCallEvidenceWorkerHealth,
  formatErrorMessage,
  renderVoiceRealCallEvidenceWorkerHealthHTML,
} from "../../../shared/browser";
import {
  VOICE_SYNC_PATH,
  VOICE_WORKER_HEALTH_TOPIC,
  voiceAgentSquadTopic,
} from "../../../constants/sync";
import type { VoiceAgentSquadDemoStatus } from "../../../types/domain";

const WORKER_HEALTH_DESCRIPTION =
  "React renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.";

type ServerHtmlPanelsInput = {
  sessionId: string | null;
};

// Reactive instead of polled: each panel loads once, then refetches only when
// the server pushes its topic over @absolutejs/sync's SSE stream. The worker
// loop republishes worker-health on every collect tick; each committed turn
// republishes the session's agent-squad status. No 3s/10s timers.
export const useServerHtmlPanels = (input: ServerHtmlPanelsInput) => {
  const [agentSquadStatus, setAgentSquadStatus] =
    useState<VoiceAgentSquadDemoStatus | null>(null);
  const [realCallWorkerHTML, setRealCallWorkerHTML] = useState(() =>
    renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
      description: WORKER_HEALTH_DESCRIPTION,
    }),
  );

  useEffect(() => {
    const refresh = async () => {
      try {
        setRealCallWorkerHTML(
          renderVoiceRealCallEvidenceWorkerHealthHTML(
            await fetchVoiceRealCallEvidenceWorkerHealth(),
            {
              description: WORKER_HEALTH_DESCRIPTION,
            },
          ),
        );
      } catch (error) {
        setRealCallWorkerHTML(
          renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
            description: WORKER_HEALTH_DESCRIPTION,
            error: formatErrorMessage(error),
          }),
        );
      }
    };

    void refresh();
    const subscriber = createSyncSubscriber({
      onEvent: () => void refresh(),
      topics: [VOICE_WORKER_HEALTH_TOPIC],
      url: VOICE_SYNC_PATH,
    });

    return () => subscriber.close();
  }, []);

  useEffect(() => {
    const refresh = () => {
      void fetchAgentSquadDemoStatus(input.sessionId || undefined).then(
        setAgentSquadStatus,
      );
    };

    refresh();

    if (!input.sessionId) {
      return;
    }

    const subscriber = createSyncSubscriber({
      onEvent: refresh,
      topics: [voiceAgentSquadTopic(input.sessionId)],
      url: VOICE_SYNC_PATH,
    });

    return () => subscriber.close();
  }, [input.sessionId]);

  return {
    agentSquadStatus,
    realCallWorkerHTML,
  };
};
