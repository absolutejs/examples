import { type ComputedRef, onMounted, onUnmounted, ref, type Ref } from "vue";
import { mountVoiceOpsActionHistory } from "@absolutejs/voice/client";
import { createSyncSubscriber } from "@absolutejs/sync/client";
import {
  mountDemoBargeInProof,
  mountVoiceLiveOpsPanel,
} from "../../../shared/browser";
import {
  VOICE_INTAKES_TOPIC,
  VOICE_SYNC_PATH,
  VOICE_TURN_TOPIC,
} from "../../../constants/sync";
import type { VueVoiceStream } from "./useVoiceDemoStreams";

const OPS_ACTION_HISTORY_INTERVAL_MS = 5_000;

type VoiceDemoWindow = typeof window & {
  __absoluteVoiceDemoSimulateDisconnect?: () => void;
};

type ImperativePanelsInput = {
  currentVoice: ComputedRef<VueVoiceStream>;
  refreshAgentSquadStatus: () => Promise<void>;
  refreshIntakes: () => Promise<void>;
  stopMic: () => void;
};

type ImperativePanels = {
  bargeInProofEl: Ref<HTMLElement | null>;
  liveOpsPanelEl: Ref<HTMLElement | null>;
  opsActionHistoryEl: Ref<HTMLElement | null>;
};

export const useImperativePanels = (
  input: ImperativePanelsInput,
): ImperativePanels => {
  const bargeInProofEl = ref<HTMLElement | null>(null);
  const opsActionHistoryEl = ref<HTMLElement | null>(null);
  const liveOpsPanelEl = ref<HTMLElement | null>(null);

  let intakesSubscriber: ReturnType<typeof createSyncSubscriber> | null = null;
  let agentSquadSubscriber: ReturnType<typeof createSyncSubscriber> | null =
    null;
  let bargeInProof: ReturnType<typeof mountDemoBargeInProof> | null = null;
  let opsActionHistory: ReturnType<typeof mountVoiceOpsActionHistory> | null =
    null;
  let liveOpsPanel: ReturnType<typeof mountVoiceLiveOpsPanel> | null = null;

  const simulateDisconnect = () =>
    input.currentVoice.value.simulateDisconnect();

  onMounted(() => {
    const demoWindow = window as VoiceDemoWindow;
    demoWindow.__absoluteVoiceDemoSimulateDisconnect = simulateDisconnect;
    window.addEventListener(
      "absolute-voice-simulate-disconnect",
      simulateDisconnect,
    );
    if (bargeInProofEl.value) {
      bargeInProof = mountDemoBargeInProof(bargeInProofEl.value);
    }
    if (opsActionHistoryEl.value) {
      opsActionHistory = mountVoiceOpsActionHistory(
        opsActionHistoryEl.value,
        "/api/voice/ops-actions/history",
        { intervalMs: OPS_ACTION_HISTORY_INTERVAL_MS },
      );
    }
    if (liveOpsPanelEl.value) {
      liveOpsPanel = mountVoiceLiveOpsPanel(liveOpsPanelEl.value, {
        getSessionId: () => input.currentVoice.value.sessionId.value,
        onControl: ({ action, detail, tag }) => {
          if (action === "force-handoff") {
            input.currentVoice.value.callControl({
              action: "transfer",
              metadata: { source: "live-ops" },
              reason: detail,
              target: tag,
            });
            input.stopMic();
          } else if (action === "escalate" || action === "operator-takeover") {
            input.currentVoice.value.callControl({
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
    }
    void input.refreshIntakes();
    void input.refreshAgentSquadStatus();
    // Reactive push instead of a 4s timer: saved intakes follow
    // VOICE_INTAKES_TOPIC; agent-squad status advances per committed turn.
    intakesSubscriber = createSyncSubscriber({
      onEvent: () => void input.refreshIntakes(),
      topics: [VOICE_INTAKES_TOPIC],
      url: VOICE_SYNC_PATH,
    });
    agentSquadSubscriber = createSyncSubscriber({
      onEvent: () => void input.refreshAgentSquadStatus(),
      topics: [VOICE_TURN_TOPIC],
      url: VOICE_SYNC_PATH,
    });
  });

  onUnmounted(() => {
    const demoWindow = window as VoiceDemoWindow;
    window.removeEventListener(
      "absolute-voice-simulate-disconnect",
      simulateDisconnect,
    );
    if (
      demoWindow.__absoluteVoiceDemoSimulateDisconnect === simulateDisconnect
    ) {
      delete demoWindow.__absoluteVoiceDemoSimulateDisconnect;
    }
    intakesSubscriber?.close();
    intakesSubscriber = null;
    agentSquadSubscriber?.close();
    agentSquadSubscriber = null;
    bargeInProof?.close();
    opsActionHistory?.close();
    liveOpsPanel?.close();
    input.stopMic();
  });

  return {
    bargeInProofEl,
    liveOpsPanelEl,
    opsActionHistoryEl,
  };
};
