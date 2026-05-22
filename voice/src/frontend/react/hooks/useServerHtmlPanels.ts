import { useEffect, useState } from "react";
import {
  fetchAgentSquadDemoStatus,
  fetchVoiceRealCallEvidenceWorkerHealth,
  formatErrorMessage,
  renderVoiceRealCallEvidenceWorkerHealthHTML,
} from "../../shared/browser";
import type { VoiceAgentSquadDemoStatus } from "../../../shared/demo";

const REAL_CALL_WORKER_INTERVAL_MS = 10_000;
const AGENT_SQUAD_INTERVAL_MS = 3_000;
const WORKER_HEALTH_DESCRIPTION =
  "React renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.";

type ServerHtmlPanelsInput = {
  sessionId: string | null;
};

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
    const intervalId = window.setInterval(
      refresh,
      REAL_CALL_WORKER_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      void fetchAgentSquadDemoStatus(input.sessionId || undefined).then(
        setAgentSquadStatus,
      );
    };

    refresh();
    const intervalId = window.setInterval(refresh, AGENT_SQUAD_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [input.sessionId]);

  return {
    agentSquadStatus,
    realCallWorkerHTML,
  };
};
