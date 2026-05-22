import { useEffect, useRef } from "react";
import { mountVoiceOpsActionHistory } from "@absolutejs/voice/client";
import {
  mountDemoBargeInProof,
  mountVoiceLiveOpsPanel,
} from "../../shared/browser";
import type { VoiceDemoMode } from "../../../shared/demo";
import type { ReactVoiceDemoStream } from "./useVoiceDemoStreams";

const OPS_ACTION_HISTORY_INTERVAL_MS = 5_000;

type VoiceDemoWindow = typeof window & {
  __absoluteVoiceDemoSimulateDisconnect?: () => void;
};

type ImperativePanelsInput = {
  activeModeRef: { current: VoiceDemoMode | null };
  currentVoice: ReactVoiceDemoStream;
  stopMic: () => void;
  voicesRef: {
    current: { general: ReactVoiceDemoStream; guided: ReactVoiceDemoStream };
  };
};

export const useImperativePanels = (input: ImperativePanelsInput) => {
  const opsActionHistoryRef = useRef<HTMLDivElement | null>(null);
  const liveOpsPanelRef = useRef<HTMLDivElement | null>(null);
  const bargeInProofRef = useRef<HTMLDivElement | null>(null);
  const { activeModeRef, currentVoice, stopMic, voicesRef } = input;

  useEffect(() => {
    const demoWindow = window as VoiceDemoWindow;
    const simulateDisconnect = () => currentVoice.simulateDisconnect();
    demoWindow.__absoluteVoiceDemoSimulateDisconnect = simulateDisconnect;
    window.addEventListener(
      "absolute-voice-simulate-disconnect",
      simulateDisconnect,
    );
    return () => {
      window.removeEventListener(
        "absolute-voice-simulate-disconnect",
        simulateDisconnect,
      );
      if (
        demoWindow.__absoluteVoiceDemoSimulateDisconnect === simulateDisconnect
      ) {
        delete demoWindow.__absoluteVoiceDemoSimulateDisconnect;
      }
    };
  }, [currentVoice]);

  useEffect(() => {
    if (!bargeInProofRef.current) {
      return;
    }

    const proof = mountDemoBargeInProof(bargeInProofRef.current);
    return () => proof.close();
  }, []);

  useEffect(() => {
    if (!opsActionHistoryRef.current) {
      return;
    }

    const history = mountVoiceOpsActionHistory(
      opsActionHistoryRef.current,
      "/api/voice/ops-actions/history",
      { intervalMs: OPS_ACTION_HISTORY_INTERVAL_MS },
    );
    return () => history.close();
  }, []);

  useEffect(() => {
    if (!liveOpsPanelRef.current) {
      return;
    }

    const panel = mountVoiceLiveOpsPanel(liveOpsPanelRef.current, {
      getSessionId: () =>
        activeModeRef.current === "general"
          ? voicesRef.current.general.sessionId
          : voicesRef.current.guided.sessionId,
      onControl: ({ action, detail, tag }) => {
        const voice =
          activeModeRef.current === "general"
            ? voicesRef.current.general
            : voicesRef.current.guided;
        if (action === "force-handoff") {
          voice.callControl({
            action: "transfer",
            metadata: { source: "live-ops" },
            reason: detail,
            target: tag,
          });
          stopMic();
        } else if (action === "escalate" || action === "operator-takeover") {
          voice.callControl({
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
    return () => panel.close();
  }, []);

  return {
    bargeInProofRef,
    liveOpsPanelRef,
    opsActionHistoryRef,
  };
};
