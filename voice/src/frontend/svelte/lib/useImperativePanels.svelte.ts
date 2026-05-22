import { mountVoiceOpsActionHistory } from "@absolutejs/voice/client";
import {
  mountDemoBargeInProof,
  mountVoiceLiveOpsPanel,
} from "../../shared/browser";
import type { VoiceStream, VoiceStreamState } from "@absolutejs/voice";
import type { SavedIntake } from "../../../shared/demo";

const OPS_ACTION_HISTORY_INTERVAL_MS = 5_000;

type VoiceDemoWindow = typeof window & {
  __absoluteVoiceDemoSimulateDisconnect?: () => void;
};

type ImperativePanelsInput = {
  getActiveVoice: () => VoiceStream<SavedIntake> | null;
  getCurrentVoice: () => VoiceStreamState<SavedIntake>;
  simulateDisconnect: () => void;
  stopMic: () => void;
};

// Returns plain "attach" helpers (element -> cleanup). The page drives them
// from `$effect`s in the .svelte component; runes must not live in a .svelte.ts
// module here, because during SSR that invokes the client `$effect` outside a
// component and throws `effect_orphan`.
export const useImperativePanels = (
  input: ImperativePanelsInput,
  providerSimulation: {
    bind: (element: Element) => () => void;
  },
) => {
  const attachSimulateDisconnect = () => {
    const demoWindow = window as VoiceDemoWindow;
    demoWindow.__absoluteVoiceDemoSimulateDisconnect = input.simulateDisconnect;
    window.addEventListener(
      "absolute-voice-simulate-disconnect",
      input.simulateDisconnect,
    );

    return () => {
      window.removeEventListener(
        "absolute-voice-simulate-disconnect",
        input.simulateDisconnect,
      );
      if (
        demoWindow.__absoluteVoiceDemoSimulateDisconnect ===
        input.simulateDisconnect
      ) {
        delete demoWindow.__absoluteVoiceDemoSimulateDisconnect;
      }
    };
  };

  const attachProviderSimulation = (element: HTMLElement) =>
    providerSimulation.bind(element);

  const attachBargeInProof = (element: HTMLElement) => {
    const proof = mountDemoBargeInProof(element);

    return () => proof.close();
  };

  const attachOpsActionHistory = (element: HTMLElement) => {
    const history = mountVoiceOpsActionHistory(
      element,
      "/api/voice/ops-actions/history",
      { intervalMs: OPS_ACTION_HISTORY_INTERVAL_MS },
    );

    return () => history.close();
  };

  const attachLiveOpsPanel = (element: HTMLElement) => {
    const panel = mountVoiceLiveOpsPanel(element, {
      getSessionId: () => input.getCurrentVoice().sessionId,
      onControl: ({ action, detail, tag }) => {
        const activeVoice = input.getActiveVoice();
        if (!activeVoice) {
          return;
        }
        if (action === "force-handoff") {
          activeVoice.callControl({
            action: "transfer",
            metadata: { source: "live-ops" },
            reason: detail,
            target: tag,
          });
          input.stopMic();
        } else if (action === "escalate" || action === "operator-takeover") {
          activeVoice.callControl({
            action: "escalate",
            metadata: {
              source: "live-ops",
              takeover: action === "operator-takeover",
            },
            reason: detail,
          });
          input.stopMic();
        } else if (action === "pause-assistant") {
          input.stopMic();
        }
      },
    });

    return () => panel.close();
  };

  return {
    attachBargeInProof,
    attachLiveOpsPanel,
    attachOpsActionHistory,
    attachProviderSimulation,
    attachSimulateDisconnect,
  };
};
