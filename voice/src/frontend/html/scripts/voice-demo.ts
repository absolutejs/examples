import {
  defineVoiceCallDebuggerLaunchElement,
  defineVoiceSessionObservabilityElement,
  defineVoiceSessionSnapshotElement,
  defineVoiceTurnLatencyElement,
} from "@absolutejs/voice/client";
import {
  getInitialVoiceModelProvider,
  getInitialVoiceProfileId,
  getInitialVoiceRoutingMode,
  getInitialVoiceSpeechEngine,
} from "../../../shared/demo";
import type { VoiceDemoMode, VoiceSpeechEngine } from "../../../types/voice";
import { createCaptureController } from "./capture";
import { wireCallControls } from "./callControls";
import { wireConfigControls } from "./config";
import {
  AGENT_SQUAD_REFRESH_INTERVAL_MS,
  createConversationRenderer,
} from "./conversation";
import { queryVoiceDemoElements } from "./dom";
import { mountLiveOps } from "./liveOps";
import { mountVoicePanels } from "./panels";
import { createDemoStreams } from "./streams";

defineVoiceCallDebuggerLaunchElement();
defineVoiceSessionObservabilityElement();
defineVoiceSessionSnapshotElement();
defineVoiceTurnLatencyElement();

const framework = document.body.dataset.framework ?? "html";
const elements = queryVoiceDemoElements();

const modelProvider = getInitialVoiceModelProvider();
const profileId = getInitialVoiceProfileId();
const routingMode = getInitialVoiceRoutingMode();
let speechEngine = getInitialVoiceSpeechEngine();
elements.modelProviderSelect.value = modelProvider;
elements.voiceProfileSelect.value = profileId;
elements.routingModeSelect.value = routingMode;
elements.speechEngineSelect.value = speechEngine;

const { generalVoice, guidedVoice } = createDemoStreams({
  modelProvider,
  profileId,
  routingMode,
  speechEngine,
});

const panels = mountVoicePanels({ elements, framework });

let activeMode: VoiceDemoMode | null = null;
let hasStartedModes: Record<VoiceDemoMode, boolean> = {
  general: false,
  guided: false,
};
const currentVoice = () =>
  activeMode === "general" ? generalVoice : guidedVoice;
const getHasStarted = () => (activeMode ? hasStartedModes[activeMode] : false);

let captureController: ReturnType<typeof createCaptureController>;
let conversation: ReturnType<typeof createConversationRenderer>;
const stopMic = () => {
  captureController.stopMic();
};
const render = () => {
  conversation.render();
};

mountLiveOps({ currentVoice, elements, stopMic });

captureController = createCaptureController({
  currentVoice,
  elements,
  onRender: render,
  speechEngine,
  onStarted: (mode) => {
    activeMode = mode;
    hasStartedModes = {
      ...hasStartedModes,
      [mode]: true,
    };
  },
});

conversation = createConversationRenderer({
  currentVoice,
  elements,
  framework,
  getHasStarted,
  getIsCapturing: captureController.getIsCapturing,
  getMicError: captureController.getMicError,
  modelProvider,
  profileId,
  renderLiveLatency: captureController.renderLiveLatency,
  renderWave: captureController.renderWave,
  routingMode,
  getActiveMode: () => activeMode,
});

wireCallControls({ currentVoice, elements, stopMic });

wireConfigControls({
  modelProviderSelect: elements.modelProviderSelect,
  onBeforeReload: stopMic,
  routingModeSelect: elements.routingModeSelect,
  speechEngineSelect: elements.speechEngineSelect,
  voiceProfileSelect: elements.voiceProfileSelect,
  onSpeechEngineChange: (engine: VoiceSpeechEngine) => {
    speechEngine = engine;
  },
});

guidedVoice.subscribe(() => {
  captureController.syncAssistantOutput();
  render();
  void conversation.renderAgentSquadStatus();
  if (guidedVoice.status === "completed") {
    void conversation.renderSavedIntakes();
  }
});

generalVoice.subscribe(() => {
  captureController.syncAssistantOutput();
  render();
  void conversation.renderAgentSquadStatus();
  if (generalVoice.status === "completed") {
    void conversation.renderSavedIntakes();
  }
});

elements.startGuidedButton.addEventListener("click", () => {
  void captureController.startMode("guided");
});

elements.startGeneralButton.addEventListener("click", () => {
  void captureController.startMode("general");
});

elements.stopButton.addEventListener("click", () => {
  stopMic();
});

window.addEventListener("beforeunload", () => {
  captureController.stopMicrophone();
  guidedVoice.close();
  generalVoice.close();
  panels.profileComparison.close();
  panels.reconnectEvidence.close();
  panels.profileSwitchRecommendation.close();
});

render();
void conversation.renderSavedIntakes();
void conversation.renderAgentSquadStatus();
const agentSquadRefreshTimer = window.setInterval(() => {
  void conversation.renderAgentSquadStatus();
}, AGENT_SQUAD_REFRESH_INTERVAL_MS);
window.addEventListener("beforeunload", () => {
  window.clearInterval(agentSquadRefreshTimer);
  panels.close();
});
