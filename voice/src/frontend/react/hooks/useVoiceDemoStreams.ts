import { useRef, useState } from "react";
import { useVoiceStream } from "@absolutejs/voice/react";
import type { VoiceTurnRecord } from "@absolutejs/voice";
import {
  getVoiceLeadMessage,
  getVoiceModePrompt,
  getVoiceProfileSwitchGuardDecision,
  getVoiceRoutePath,
} from "../../../shared/demo";
import type { SavedIntake } from "../../../types/domain";
import type {
  VoiceDemoMode,
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceSpeechEngine,
} from "../../../types/voice";

const RECONNECT_REPORT_PATH = "/api/voice/reconnect-traces";

export type ReactVoiceDemoStream = ReturnType<
  typeof useVoiceStream<SavedIntake>
>;

export const EMPTY_VOICE: ReactVoiceDemoStream = {
  assistantAudio: [] as Array<{
    chunk: Uint8Array;
    format: {
      channels: 1 | 2;
      container: "raw";
      encoding: "alaw" | "mulaw" | "pcm_s16le";
      sampleRateHz: number;
    };
    receivedAt: number;
    turnId?: string;
  }>,
  assistantTexts: [] as string[],
  call: null,
  error: null as string | null,
  isConnected: false,
  partial: "",
  reconnect: {
    attempts: 0,
    maxAttempts: 0,
    status: "idle",
  },
  scenarioId: null as string | null,
  sessionId: "",
  sessionMetadata: null,
  status: "idle" as const,
  turns: [] as VoiceTurnRecord<SavedIntake>[],
  callControl: () => {},
  close: () => {},
  endTurn: () => {},
  sendAudio: (_audio: Uint8Array | ArrayBuffer) => {},
  simulateDisconnect: () => {},
};

type VoiceDemoStreamsInput = {
  modelProvider: VoiceModelProvider;
  profileId: VoiceProfileId;
  routingMode: VoiceRoutingMode;
  speechEngine: VoiceSpeechEngine;
};

export const useVoiceDemoStreams = (input: VoiceDemoStreamsInput) => {
  const activeModeRef = useRef<VoiceDemoMode | null>(null);
  const sessionIdsRef = useRef<{ general: string; guided: string } | null>(null);
  if (!sessionIdsRef.current) {
    sessionIdsRef.current = {
      general: crypto.randomUUID(),
      guided: crypto.randomUUID(),
    };
  }
  const voicesRef = useRef({ general: EMPTY_VOICE, guided: EMPTY_VOICE });
  const startMicRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const [activeMode, setActiveMode] = useState<VoiceDemoMode | null>(null);
  const [hasStartedModes, setHasStartedModes] = useState<
    Record<VoiceDemoMode, boolean>
  >({
    general: false,
    guided: false,
  });
  const guidedVoice =
    useVoiceStream<SavedIntake>(
      getVoiceRoutePath(
        "guided",
        input.modelProvider,
        input.routingMode,
        input.speechEngine,
        input.profileId,
        sessionIdsRef.current.guided,
      ),
      { reconnectReportPath: RECONNECT_REPORT_PATH },
    ) ?? EMPTY_VOICE;
  const generalVoice =
    useVoiceStream<SavedIntake>(
      getVoiceRoutePath(
        "general",
        input.modelProvider,
        input.routingMode,
        input.speechEngine,
        input.profileId,
      ),
      { reconnectReportPath: RECONNECT_REPORT_PATH },
    ) ?? EMPTY_VOICE;
  voicesRef.current = { general: generalVoice, guided: guidedVoice };
  const currentVoice = activeMode === "general" ? generalVoice : guidedVoice;
  const profileSwitchGuardDecision = getVoiceProfileSwitchGuardDecision(
    currentVoice.sessionMetadata,
  );
  const currentPrompt = getVoiceModePrompt({
    hasStarted:
      (activeMode ? hasStartedModes[activeMode] : false) ||
      currentVoice.turns.length > 0,
    mode: activeMode,
    status: currentVoice.status,
    turnCount: currentVoice.turns.length,
  });
  const leadMessage = getVoiceLeadMessage({
    hasStarted:
      (activeMode ? hasStartedModes[activeMode] : false) ||
      currentVoice.turns.length > 0,
    mode: activeMode,
    status: currentVoice.status,
    turnCount: currentVoice.turns.length,
  });

  const bindStartMic = (startMic: () => Promise<void>) => {
    startMicRef.current = startMic;
  };

  const resetActiveMode = () => {
    activeModeRef.current = null;
    setActiveMode(null);
  };

  const startMode = async (mode: VoiceDemoMode) => {
    activeModeRef.current = mode;
    setActiveMode(mode);
    setHasStartedModes((current) => ({
      ...current,
      [mode]: true,
    }));
    await startMicRef.current();
  };

  return {
    activeMode,
    activeModeRef,
    bindStartMic,
    currentPrompt,
    currentVoice,
    generalVoice,
    guidedVoice,
    leadMessage,
    profileSwitchGuardDecision,
    resetActiveMode,
    startMode,
    voicesRef,
  };
};
