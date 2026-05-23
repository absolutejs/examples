import { mountVoiceLiveOpsPanel } from "../../../shared/browser";
import type { VoiceDemoElements } from "./dom";
import type { VoiceDemoStream } from "./streams";

type VoiceDemoWindow = typeof window & {
  __absoluteVoiceDemoSimulateDisconnect?: () => void;
};

type LiveOpsInput = {
  currentVoice: () => VoiceDemoStream;
  elements: VoiceDemoElements;
  stopMic: () => void;
};

export const mountLiveOps = (input: LiveOpsInput) => {
  const { currentVoice, elements, stopMic } = input;
  const simulateDisconnect = () => {
    currentVoice().simulateDisconnect();
  };
  (window as VoiceDemoWindow).__absoluteVoiceDemoSimulateDisconnect =
    simulateDisconnect;
  window.addEventListener(
    "absolute-voice-simulate-disconnect",
    simulateDisconnect,
  );
  const liveOpsPanel = mountVoiceLiveOpsPanel(elements.liveOpsPanelHost, {
    getSessionId: () => currentVoice().sessionId,
    onControl: ({ action, detail, tag }) => {
      if (action === "force-handoff") {
        currentVoice().callControl({
          action: "transfer",
          metadata: { source: "live-ops" },
          reason: detail,
          target: tag,
        });
        stopMic();
      } else if (action === "escalate" || action === "operator-takeover") {
        currentVoice().callControl({
          action: "escalate",
          metadata: {
            source: "live-ops",
            takeover: action === "operator-takeover",
          },
          reason: detail,
        });
        stopMic();
      } else if (action === "pause-assistant") {
        stopMic();
      }
    },
  });

  return { liveOpsPanel };
};
