import { createVoiceStream } from "@absolutejs/voice/svelte";
import type { VoiceStream, VoiceStreamState } from "@absolutejs/voice";
import {
  getVoiceLeadMessage,
  getVoiceModePrompt,
  getVoiceProfileSwitchGuardDecision,
  getVoiceRoutePath,
  type SavedIntake,
  type VoiceDemoMode,
  type VoiceModelProvider,
  type VoiceProfileId,
  type VoiceProfileSwitchGuardClientDecision,
  type VoiceRoutingMode,
  type VoiceSpeechEngine,
} from "../../../shared/demo";

const RECONNECT_REPORT_PATH = "/api/voice/reconnect-traces";

type VoiceDemoStreamsInput = {
  modelProvider: VoiceModelProvider;
  onAssistantOutput: () => void;
  profileId: VoiceProfileId;
  routingMode: VoiceRoutingMode;
  speechEngine: VoiceSpeechEngine;
};

type VoiceDemoStreams = {
  readonly activeMode: VoiceDemoMode | null;
  readonly callLifecycleLabel: string;
  connect: () => void;
  readonly currentPrompt: string;
  readonly currentVoice: VoiceStreamState<SavedIntake>;
  destroy: () => void;
  getActiveVoice: () => VoiceStream<SavedIntake> | null;
  readonly leadMessage: string;
  readonly profileSwitchGuardDecision: VoiceProfileSwitchGuardClientDecision | null;
  resetActiveMode: () => void;
  setActiveMode: (mode: VoiceDemoMode) => void;
  simulateDisconnect: () => void;
};

const createInitialVoiceState = (): VoiceStreamState<SavedIntake> => ({
  assistantTexts: [],
  assistantAudio: [],
  call: null,
  error: null,
  isConnected: false,
  partial: "",
  reconnect: {
    attempts: 0,
    maxAttempts: 0,
    status: "idle",
  },
  scenarioId: null,
  sessionMetadata: null,
  sessionId: null,
  status: "idle",
  turns: [],
});

export const useVoiceDemoStreams = (
  input: VoiceDemoStreamsInput,
): VoiceDemoStreams => {
  let activeMode = $state<VoiceDemoMode | null>(null);
  let hasStartedModes = $state<Record<VoiceDemoMode, boolean>>({
    general: false,
    guided: false,
  });
  let guidedState = $state(createInitialVoiceState());
  let generalState = $state(createInitialVoiceState());
  let guidedVoice: VoiceStream<SavedIntake> | null = null;
  let generalVoice: VoiceStream<SavedIntake> | null = null;
  let unsubscribeGuided = () => {};
  let unsubscribeGeneral = () => {};

  const currentVoice = $derived(
    activeMode === "general" ? generalState : guidedState,
  );
  const profileSwitchGuardDecision = $derived(
    getVoiceProfileSwitchGuardDecision(currentVoice.sessionMetadata),
  );
  const currentPrompt = $derived(
    getVoiceModePrompt({
      hasStarted:
        (activeMode ? hasStartedModes[activeMode] : false) ||
        currentVoice.turns.length > 0,
      mode: activeMode,
      status: currentVoice.status,
      turnCount: currentVoice.turns.length,
    }),
  );
  const leadMessage = $derived(
    getVoiceLeadMessage({
      hasStarted:
        (activeMode ? hasStartedModes[activeMode] : false) ||
        currentVoice.turns.length > 0,
      mode: activeMode,
      status: currentVoice.status,
      turnCount: currentVoice.turns.length,
    }),
  );
  const callLifecycleLabel = $derived(
    currentVoice.call?.disposition
      ? `${currentVoice.call.disposition} after ${currentVoice.call.events.length} lifecycle event${currentVoice.call.events.length === 1 ? "" : "s"}`
      : (currentVoice.call?.events.at(-1)?.type ?? "Not started"),
  );

  const getActiveVoice = () =>
    activeMode === "general" ? generalVoice : guidedVoice;

  const connect = () => {
    unsubscribeGuided();
    unsubscribeGeneral();
    guidedVoice?.close();
    generalVoice?.close();
    guidedVoice = createVoiceStream<SavedIntake>(
      getVoiceRoutePath(
        "guided",
        input.modelProvider,
        input.routingMode,
        input.speechEngine,
        input.profileId,
      ),
      { reconnectReportPath: RECONNECT_REPORT_PATH },
    );
    generalVoice = createVoiceStream<SavedIntake>(
      getVoiceRoutePath(
        "general",
        input.modelProvider,
        input.routingMode,
        input.speechEngine,
        input.profileId,
      ),
      { reconnectReportPath: RECONNECT_REPORT_PATH },
    );
    guidedState = { ...guidedVoice.getSnapshot() };
    generalState = { ...generalVoice.getSnapshot() };
    unsubscribeGuided = guidedVoice.subscribe(() => {
      guidedState = { ...guidedVoice!.getSnapshot() };
      input.onAssistantOutput();
    });
    unsubscribeGeneral = generalVoice.subscribe(() => {
      generalState = { ...generalVoice!.getSnapshot() };
      input.onAssistantOutput();
    });
  };

  const setActiveMode = (mode: VoiceDemoMode) => {
    activeMode = mode;
    hasStartedModes = { ...hasStartedModes, [mode]: true };
  };

  const resetActiveMode = () => {
    activeMode = null;
  };

  const simulateDisconnect = () => getActiveVoice()?.simulateDisconnect();

  const destroy = () => {
    unsubscribeGuided();
    unsubscribeGeneral();
    guidedVoice?.close();
    generalVoice?.close();
  };

  return {
    get activeMode() {
      return activeMode;
    },
    get callLifecycleLabel() {
      return callLifecycleLabel;
    },
    connect,
    get currentPrompt() {
      return currentPrompt;
    },
    get currentVoice() {
      return currentVoice;
    },
    destroy,
    getActiveVoice,
    get leadMessage() {
      return leadMessage;
    },
    get profileSwitchGuardDecision() {
      return profileSwitchGuardDecision;
    },
    resetActiveMode,
    setActiveMode,
    simulateDisconnect,
  };
};
