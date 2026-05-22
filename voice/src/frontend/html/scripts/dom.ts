export type VoiceDemoElements = {
  agentSquadRoot: HTMLElement;
  bargeInProofHost: HTMLElement;
  callControlRoot: HTMLElement;
  callLifecycleStatus: HTMLElement;
  campaignDialerProofHost: HTMLElement;
  chatList: HTMLElement;
  connectionMetric: HTMLElement;
  errorStatus: HTMLElement;
  intakesMetric: HTMLElement;
  liveLatencyProofHost: HTMLElement;
  liveOpsPanelHost: HTMLElement;
  microphoneStatus: HTMLElement;
  modelProviderMetric: HTMLElement;
  modelProviderSelect: HTMLSelectElement;
  partialStatus: HTMLElement;
  platformCoverageHost: HTMLElement;
  profileComparisonHost: HTMLElement;
  profileSwitchGuardMetric: HTMLElement;
  profileSwitchGuardSummary: HTMLElement;
  profileSwitchHost: HTMLElement;
  promptStatus: HTMLElement;
  proofTrendsHost: HTMLElement;
  providerCapabilitiesHost: HTMLElement;
  providerContractsHost: HTMLElement;
  providerSimulationHost: HTMLElement;
  providerStatusHost: HTMLElement;
  readinessFailuresHost: HTMLElement;
  realCallWorkerHost: HTMLElement;
  reconnectEvidenceHost: HTMLElement;
  reconnectStatus: HTMLElement;
  routingDecisionRoot: HTMLElement;
  routingModeCopy: HTMLElement;
  routingModeMetric: HTMLElement;
  routingModeSelect: HTMLSelectElement;
  savedIntakesRoot: HTMLElement;
  sessionMetric: HTMLElement;
  speechEngineSelect: HTMLSelectElement;
  startGeneralButton: HTMLButtonElement;
  startGuidedButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  turnQualityHost: HTMLElement;
  voiceMonitor: HTMLElement;
  voiceMonitorCopy: HTMLElement;
  voiceProfileSelect: HTMLSelectElement;
  voiceStatus: HTMLElement;
  voiceWaveGlow: SVGPathElement;
  voiceWavePath: SVGPathElement;
  workflowStatusHost: HTMLElement;
};

export const queryVoiceDemoElements = (): VoiceDemoElements => {
  const chatList = document.querySelector("#chat-list");
  const connectionMetric = document.querySelector("#metric-connection");
  const errorStatus = document.querySelector("#status-error");
  const intakesMetric = document.querySelector("#metric-intakes");
  const microphoneStatus = document.querySelector("#status-mic");
  const modelProviderMetric = document.querySelector("#metric-provider");
  const modelProviderSelect = document.querySelector("#model-provider-select");
  const voiceProfileSelect = document.querySelector("#voice-profile-select");
  const speechEngineSelect = document.querySelector("#speech-engine-select");
  const partialStatus = document.querySelector("#status-partial");
  const promptStatus = document.querySelector("#status-prompt");
  const savedIntakesRoot = document.querySelector("#saved-intakes");
  const sessionMetric = document.querySelector("#metric-session");
  const startGuidedButton = document.querySelector("#start-guided");
  const startGeneralButton = document.querySelector("#start-general");
  const stopButton = document.querySelector("#stop-mic");
  const callControlRoot = document.querySelector("#call-control-actions");
  const callLifecycleStatus = document.querySelector("#status-call-lifecycle");
  const reconnectStatus = document.querySelector("#status-reconnect");
  const voiceStatus = document.querySelector("#status-voice");
  const profileSwitchGuardMetric = document.querySelector(
    "#metric-profile-switch-guard",
  );
  const profileSwitchGuardSummary = document.querySelector(
    "#metric-profile-switch-guard-summary",
  );
  const voiceMonitor = document.querySelector("#voice-monitor");
  const voiceMonitorCopy = document.querySelector("#voice-monitor-copy");
  const voiceWaveGlow = document.querySelector("#voice-wave-glow");
  const voiceWavePath = document.querySelector("#voice-wave-path");
  const workflowStatusHost = document.querySelector("#workflow-status-card");
  const realCallWorkerHost = document.querySelector("#real-call-worker-card");
  const platformCoverageHost = document.querySelector(
    "#platform-coverage-card",
  );
  const proofTrendsHost = document.querySelector("#proof-trends-card");
  const profileComparisonHost = document.querySelector(
    "#profile-comparison-card",
  );
  const reconnectEvidenceHost = document.querySelector(
    "#reconnect-evidence-card",
  );
  const profileSwitchHost = document.querySelector("#profile-switch-card");
  const readinessFailuresHost = document.querySelector(
    "#readiness-failures-card",
  );
  const providerCapabilitiesHost = document.querySelector(
    "#provider-capabilities-card",
  );
  const providerContractsHost = document.querySelector(
    "#provider-contracts-card",
  );
  const providerStatusHost = document.querySelector("#provider-status-card");
  const campaignDialerProofHost = document.querySelector(
    "#campaign-dialer-proof-card",
  );
  const providerSimulationHost = document.querySelector(
    "#provider-simulation-card",
  );
  const routingModeCopy = document.querySelector("#routing-mode-copy");
  const routingDecisionRoot = document.querySelector("#routing-decision");
  const agentSquadRoot = document.querySelector("#agent-squad-card");
  const bargeInProofHost = document.querySelector("#barge-in-proof-card");
  const liveLatencyProofHost = document.querySelector(
    "#live-latency-proof-card",
  );
  const liveOpsPanelHost = document.querySelector("#live-ops-panel");
  const turnQualityHost = document.querySelector("#turn-quality-card");
  const routingModeMetric = document.querySelector("#metric-routing");
  const routingModeSelect = document.querySelector("#routing-mode-select");

  if (
    !(chatList instanceof HTMLElement) ||
    !(connectionMetric instanceof HTMLElement) ||
    !(errorStatus instanceof HTMLElement) ||
    !(intakesMetric instanceof HTMLElement) ||
    !(microphoneStatus instanceof HTMLElement) ||
    !(modelProviderMetric instanceof HTMLElement) ||
    !(modelProviderSelect instanceof HTMLSelectElement) ||
    !(voiceProfileSelect instanceof HTMLSelectElement) ||
    !(speechEngineSelect instanceof HTMLSelectElement) ||
    !(partialStatus instanceof HTMLElement) ||
    !(promptStatus instanceof HTMLElement) ||
    !(savedIntakesRoot instanceof HTMLElement) ||
    !(sessionMetric instanceof HTMLElement) ||
    !(startGuidedButton instanceof HTMLButtonElement) ||
    !(startGeneralButton instanceof HTMLButtonElement) ||
    !(stopButton instanceof HTMLButtonElement) ||
    !(callControlRoot instanceof HTMLElement) ||
    !(callLifecycleStatus instanceof HTMLElement) ||
    !(reconnectStatus instanceof HTMLElement) ||
    !(voiceMonitor instanceof HTMLElement) ||
    !(voiceMonitorCopy instanceof HTMLElement) ||
    !(voiceWaveGlow instanceof SVGPathElement) ||
    !(voiceWavePath instanceof SVGPathElement) ||
    !(workflowStatusHost instanceof HTMLElement) ||
    !(platformCoverageHost instanceof HTMLElement) ||
    !(realCallWorkerHost instanceof HTMLElement) ||
    !(proofTrendsHost instanceof HTMLElement) ||
    !(profileComparisonHost instanceof HTMLElement) ||
    !(reconnectEvidenceHost instanceof HTMLElement) ||
    !(profileSwitchHost instanceof HTMLElement) ||
    !(readinessFailuresHost instanceof HTMLElement) ||
    !(providerCapabilitiesHost instanceof HTMLElement) ||
    !(providerContractsHost instanceof HTMLElement) ||
    !(providerStatusHost instanceof HTMLElement) ||
    !(campaignDialerProofHost instanceof HTMLElement) ||
    !(providerSimulationHost instanceof HTMLElement) ||
    !(routingModeCopy instanceof HTMLElement) ||
    !(routingDecisionRoot instanceof HTMLElement) ||
    !(agentSquadRoot instanceof HTMLElement) ||
    !(bargeInProofHost instanceof HTMLElement) ||
    !(liveLatencyProofHost instanceof HTMLElement) ||
    !(liveOpsPanelHost instanceof HTMLElement) ||
    !(turnQualityHost instanceof HTMLElement) ||
    !(routingModeMetric instanceof HTMLElement) ||
    !(routingModeSelect instanceof HTMLSelectElement) ||
    !(profileSwitchGuardMetric instanceof HTMLElement) ||
    !(profileSwitchGuardSummary instanceof HTMLElement) ||
    !(voiceStatus instanceof HTMLElement)
  ) {
    throw new Error("Voice demo page is missing expected elements.");
  }

  return {
    agentSquadRoot,
    bargeInProofHost,
    callControlRoot,
    callLifecycleStatus,
    campaignDialerProofHost,
    chatList,
    connectionMetric,
    errorStatus,
    intakesMetric,
    liveLatencyProofHost,
    liveOpsPanelHost,
    microphoneStatus,
    modelProviderMetric,
    modelProviderSelect,
    partialStatus,
    platformCoverageHost,
    profileComparisonHost,
    profileSwitchGuardMetric,
    profileSwitchGuardSummary,
    profileSwitchHost,
    promptStatus,
    proofTrendsHost,
    providerCapabilitiesHost,
    providerContractsHost,
    providerSimulationHost,
    providerStatusHost,
    readinessFailuresHost,
    realCallWorkerHost,
    reconnectEvidenceHost,
    reconnectStatus,
    routingDecisionRoot,
    routingModeCopy,
    routingModeMetric,
    routingModeSelect,
    savedIntakesRoot,
    sessionMetric,
    speechEngineSelect,
    startGeneralButton,
    startGuidedButton,
    stopButton,
    turnQualityHost,
    voiceMonitor,
    voiceMonitorCopy,
    voiceProfileSelect,
    voiceStatus,
    voiceWaveGlow,
    voiceWavePath,
    workflowStatusHost,
  };
};
