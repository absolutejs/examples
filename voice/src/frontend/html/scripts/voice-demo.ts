import {
  createVoiceStream,
  createVoiceCampaignDialerProofStore,
  createVoicePlatformCoverageStore,
  mountVoiceProfileComparison,
  mountVoiceProfileSwitchRecommendation,
  mountVoiceReconnectProfileEvidence,
  mountVoiceOpsStatus,
  mountVoiceProofTrends,
  mountVoiceProviderCapabilities,
  mountVoiceProviderContracts,
  mountVoiceProviderSimulationControls,
  mountVoiceProviderStatus,
  mountVoiceReadinessFailures,
  mountVoiceRoutingStatus,
  defineVoiceCallDebuggerLaunchElement,
  defineVoiceSessionObservabilityElement,
  defineVoiceSessionSnapshotElement,
  defineVoiceTurnLatencyElement,
  mountVoiceTurnQuality,
  renderVoicePlatformCoverageHTML,
} from "@absolutejs/voice/client";
import {
  createInitialVoiceWaveLevels,
  createVoiceWavePath,
  createDemoBargeInEvidence,
  createDemoLiveTurnLatencyEvidence,
  createDemoMicrophone,
  fetchAgentSquadDemoStatus,
  fetchSavedIntakes,
  formatErrorMessage,
  formatDateTime,
  formatReconnectState,
  mountDemoBargeInProof,
  mountVoiceRealCallEvidenceWorkerHealth,
  mountVoiceLiveOpsPanel,
  pushVoiceWaveLevel,
  renderDemoLiveTurnLatencyHTML,
} from "../../shared/browser";
import {
  getVoiceLeadMessage,
  getVoiceModeLabel,
  getVoiceModePrompt,
  getVoiceProfileLabel,
  getVoiceProfileSwitchGuardDecision,
  getVoiceProviderLabel,
  getVoiceRoutingLabel,
  getVoiceRoutePath,
  getVoiceSpeechEngineSampleRate,
  getInitialVoiceModelProvider,
  getInitialVoiceProfileId,
  getInitialVoiceRoutingMode,
  getInitialVoiceSpeechEngine,
  formatVoiceProfileSwitchGuardLabel,
  formatVoiceProfileSwitchGuardSummary,
  rememberVoiceModelProvider,
  rememberVoiceProfileId,
  rememberVoiceRoutingMode,
  rememberVoiceSpeechEngine,
  VOICE_DEMO_GENERAL_LABEL,
  VOICE_DEMO_GUIDED_LABEL,
  VOICE_DEMO_MIC_IDLE,
  VOICE_DEMO_MIC_LIVE,
  VOICE_DEMO_STOP_LABEL,
  VOICE_CALL_CONTROL_ACTIONS,
  VOICE_PROFILES,
  VOICE_ROUTING_MODES,
  type VoiceModelProvider,
  type VoiceProfileId,
  type VoiceRoutingMode,
  type VoiceSpeechEngine,
  type SavedIntake,
  type VoiceDemoMode,
} from "../../../shared/demo";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

type HtmxWindow = Window & {
  htmx?: {
    trigger: (target: string | Element, event: string) => void;
  };
};

const framework = document.body.dataset.framework ?? "html";
defineVoiceCallDebuggerLaunchElement();
defineVoiceSessionObservabilityElement();
defineVoiceSessionSnapshotElement();
defineVoiceTurnLatencyElement();
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
const platformCoverageHost = document.querySelector("#platform-coverage-card");
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
const liveLatencyProofHost = document.querySelector("#live-latency-proof-card");
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

const modelProvider = getInitialVoiceModelProvider();
const profileId = getInitialVoiceProfileId();
const routingMode = getInitialVoiceRoutingMode();
let speechEngine = getInitialVoiceSpeechEngine();
modelProviderSelect.value = modelProvider;
voiceProfileSelect.value = profileId;
routingModeSelect.value = routingMode;
speechEngineSelect.value = speechEngine;
const guidedVoice = createVoiceStream<SavedIntake>(
  getVoiceRoutePath(
    "guided",
    modelProvider,
    routingMode,
    speechEngine,
    profileId,
  ),
  { reconnectReportPath: "/api/voice/reconnect-traces" },
);
const generalVoice = createVoiceStream<SavedIntake>(
  getVoiceRoutePath(
    "general",
    modelProvider,
    routingMode,
    speechEngine,
    profileId,
  ),
  { reconnectReportPath: "/api/voice/reconnect-traces" },
);
const opsStatus = mountVoiceOpsStatus(
  workflowStatusHost,
  "/api/voice/ops-status",
  {
    intervalMs: 5_000,
  },
);
const proofTrends = mountVoiceProofTrends(
  proofTrendsHost,
  "/api/voice/proof-trends",
  {
    description: `${framework.toUpperCase()} renders sustained proof freshness and p95 metrics from the package proof-trends widget.`,
    intervalMs: 10_000,
    title: "Sustained Proof Trends",
  },
);
const profileComparison = mountVoiceProfileComparison(
  profileComparisonHost,
  "/api/voice/real-call-profile-history",
  {
    description: `${framework.toUpperCase()} renders measured profile defaults and persisted reconnect resume evidence behind each selected stack.`,
    intervalMs: 10_000,
    title: "Profile + Reconnect Evidence",
  },
);
const reconnectEvidence = mountVoiceReconnectProfileEvidence(
  reconnectEvidenceHost,
);
const profileSwitchRecommendation = mountVoiceProfileSwitchRecommendation(
  profileSwitchHost,
  "/api/voice/profile-switch-recommendation",
  {
    description: `${framework.toUpperCase()} compares latest session signals against measured profile evidence and recommends whether to switch stacks.`,
    intervalMs: 10_000,
    title: "Profile Switch Recommendation",
  },
);
const readinessFailures = mountVoiceReadinessFailures(
  readinessFailuresHost,
  "/api/production-readiness",
  {
    description: `${framework.toUpperCase()} renders structured deploy-gate explanations from production readiness JSON when calibrated gates warn or fail.`,
    intervalMs: 10_000,
    title: "Readiness Gate Explanations",
  },
);
const platformCoverage = createVoicePlatformCoverageStore(
  "/api/voice/platform-coverage",
  {
    intervalMs: 10_000,
  },
);
const providerStatus = mountVoiceProviderStatus(
  providerStatusHost,
  "/api/provider-status",
  {
    intervalMs: 5_000,
  },
);
const providerCapabilities = mountVoiceProviderCapabilities(
  providerCapabilitiesHost,
  "/api/provider-capabilities",
  {
    intervalMs: 5_000,
  },
);
const providerContracts = mountVoiceProviderContracts(
  providerContractsHost,
  "/api/provider-contracts",
  {
    intervalMs: 5_000,
  },
);
const providerSimulation = mountVoiceProviderSimulationControls(
  providerSimulationHost,
  {
    failureMessage:
      "Prove Deepgram STT failover to AssemblyAI without changing credentials.",
    failureProviders: ["deepgram"],
    fallbackRequiredMessage:
      "Add ASSEMBLYAI_API_KEY to enable the fallback simulation.",
    fallbackRequiredProvider: "assemblyai",
    kind: "stt",
    providers: [{ provider: "deepgram" }, { provider: "assemblyai" }],
  },
);
const campaignDialerProof = createVoiceCampaignDialerProofStore(
  "/api/voice/campaigns/dialer-proof",
);
const routingStatus = mountVoiceRoutingStatus(
  routingDecisionRoot,
  "/api/routing/latest",
  {
    intervalMs: 4_000,
  },
);
const turnQuality = mountVoiceTurnQuality(
  turnQualityHost,
  "/api/turn-quality",
  {
    intervalMs: 5_000,
  },
);
const realCallWorkerHealth = mountVoiceRealCallEvidenceWorkerHealth(
  realCallWorkerHost,
  "/api/voice/real-call-evidence-runtime/worker",
  {
    description: `${framework.toUpperCase()} renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.`,
  },
);
const renderPlatformCoverage = () => {
  platformCoverageHost.innerHTML = renderVoicePlatformCoverageHTML(
    platformCoverage.getSnapshot(),
    {
      description: `${framework.toUpperCase()} renders the package coverage widget against the same proof-backed route used by the server.`,
      limit: 4,
      title: "Vapi Replacement Coverage",
    },
  );
};
const unsubscribePlatformCoverage = platformCoverage.subscribe(
  renderPlatformCoverage,
);
renderPlatformCoverage();
void platformCoverage.refresh().catch(() => {});
const renderCampaignDialerProof = () => {
  const snapshot = campaignDialerProof.getSnapshot();
  const providers =
    snapshot.report?.providers.map((provider) => ({
      label: provider.provider,
      passed: provider.outcomes.every((outcome) => outcome.applied),
      requests: provider.carrierRequests.length,
    })) ?? [];
  campaignDialerProofHost.innerHTML = `<span class="voice-framework-pill">Campaign Dialer Proof</span>
    <h2>Carrier dialer dry-run</h2>
    <p class="voice-footnote">Twilio, Telnyx, and Plivo campaign dials run through the shared browser store, attach campaign metadata, and resolve synthetic webhook outcomes.</p>
    <button class="absolute-voice-turn-latency__proof" type="button" ${snapshot.isLoading ? "disabled" : ""} id="campaign-dialer-proof-run">${snapshot.isLoading ? "Running proof" : "Run campaign dialer proof"}</button>
    ${
      providers.length
        ? `<div class="voice-provider-health-list">${providers
            .map(
              (provider) => `<div class="voice-provider-health-item">
        <strong>${escapeHtml(provider.label)}</strong>
        <span>${provider.passed ? "passed" : "needs attention"}</span>
        <small>${provider.requests} dry-run carrier request${provider.requests === 1 ? "" : "s"}</small>
      </div>`,
            )
            .join("")}</div>`
        : `<p class="empty-copy">Ready for ${escapeHtml((snapshot.status?.providers ?? ["twilio", "telnyx", "plivo"]).join(", "))}.</p>`
    }
    ${snapshot.error ? `<p class="voice-footnote">${escapeHtml(snapshot.error)}</p>` : ""}
    <p class="voice-footnote"><a href="/voice/campaigns/dialer-proof">Open full proof</a></p>`;
  campaignDialerProofHost
    .querySelector("#campaign-dialer-proof-run")
    ?.addEventListener("click", () => {
      void campaignDialerProof.runProof().catch(() => {});
    });
};
const unsubscribeCampaignDialerProof = campaignDialerProof.subscribe(
  renderCampaignDialerProof,
);
renderCampaignDialerProof();
void campaignDialerProof.refresh().catch(() => {});
const bargeInProof = mountDemoBargeInProof(bargeInProofHost);
let activeMode: VoiceDemoMode | null = null;
let hasStartedModes: Record<VoiceDemoMode, boolean> = {
  general: false,
  guided: false,
};
const currentVoice = () =>
  activeMode === "general" ? generalVoice : guidedVoice;
type VoiceDemoWindow = typeof window & {
  __absoluteVoiceDemoSimulateDisconnect?: () => void;
};
const simulateDisconnect = () => {
  currentVoice().simulateDisconnect();
};
(window as VoiceDemoWindow).__absoluteVoiceDemoSimulateDisconnect =
  simulateDisconnect;
window.addEventListener(
  "absolute-voice-simulate-disconnect",
  simulateDisconnect,
);
const liveOpsPanel = mountVoiceLiveOpsPanel(liveOpsPanelHost, {
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
const bargeInEvidence = createDemoBargeInEvidence(() => currentVoice());
const liveLatencyEvidence = createDemoLiveTurnLatencyEvidence(() =>
  currentVoice(),
);
const microphone = createDemoMicrophone(
  (audio) => {
    liveLatencyEvidence.recordAudio(audio);
    liveLatencyProofHost.innerHTML = renderDemoLiveTurnLatencyHTML(
      liveLatencyEvidence.getSnapshot(),
    );
    bargeInEvidence.sendAudio(audio);
  },
  (level) => {
    waveLevels = pushVoiceWaveLevel(waveLevels, level);
    renderWave();
  },
  {
    sampleRateHz: getVoiceSpeechEngineSampleRate(speechEngine),
  },
);
let isCapturing = false;
let micError: string | null = null;
let waveLevels = createInitialVoiceWaveLevels();

const renderWave = () => {
  const path = createVoiceWavePath(waveLevels);
  voiceWaveGlow.setAttribute("d", path);
  voiceWavePath.setAttribute("d", path);
  voiceMonitorCopy.innerHTML = `<span class="voice-live-dot"></span>${
    isCapturing ? "Microphone live" : "Microphone idle"
  }`;
  voiceMonitorCopy.classList.toggle("is-live", isCapturing);
  voiceMonitor.classList.toggle("is-live", isCapturing);
};

const renderChat = () => {
  const voice = currentVoice();
  const leadMessage = getVoiceLeadMessage({
    hasStarted:
      (activeMode ? hasStartedModes[activeMode] : false) ||
      voice.turns.length > 0,
    mode: activeMode,
    status: voice.status,
    turnCount: voice.turns.length,
  });

  chatList.innerHTML = `<article class="voice-chat-message assistant">
  <div class="voice-chat-role">${escapeHtml(activeMode ? getVoiceModeLabel(activeMode) : "Voice demo")}</div>
  <p class="voice-turn-text">${escapeHtml(leadMessage)}</p>
</article>${voice.turns
    .map(
      (turn) => `<div class="voice-chat-stack">
  <article class="voice-chat-message user">
    <div class="voice-chat-role">You</div>
    <p class="voice-turn-text">${escapeHtml(turn.text)}</p>
  </article>
  ${
    turn.assistantText
      ? `<article class="voice-chat-message assistant">
    <div class="voice-chat-role">${escapeHtml(activeMode ? getVoiceModeLabel(activeMode) : "Guide")}</div>
    <p class="voice-turn-text">${escapeHtml(turn.assistantText)}</p>
  </article>`
      : ""
  }
</div>`,
    )
    .join("")}${
    voice.partial
      ? `<article class="voice-chat-message user pending">
  <div class="voice-chat-role">Speaking</div>
  <p class="voice-turn-text">${escapeHtml(voice.partial)}</p>
</article>`
      : ""
  }`;
};

const renderSavedIntakes = async () => {
  const intakes = await fetchSavedIntakes();
  intakesMetric.textContent = String(intakes.length);

  if (framework === "htmx") {
    const htmxWindow = window as unknown as HtmxWindow;

    if (htmxWindow.htmx) {
      htmxWindow.htmx.trigger(document.body, "refresh");
    }
    return;
  }

  if (intakes.length === 0) {
    savedIntakesRoot.innerHTML = `<p class="empty-copy">No saved captures yet.</p>`;
    return;
  }

  savedIntakesRoot.innerHTML = intakes
    .map(
      (intake) => `<article class="saved-item">
  <div class="saved-item-header">
    <strong>${escapeHtml(intake.title)}</strong>
    <span>${formatDateTime(intake.completedAt)}</span>
  </div>
  <div class="saved-item-meta">
    <span class="pill">${escapeHtml(getVoiceModeLabel(intake.scenarioId))}</span>
    <span class="pill">${intake.turnCount} turn${intake.turnCount === 1 ? "" : "s"}</span>
    ${intake.detectedName ? `<span class="pill">${escapeHtml(intake.detectedName)}</span>` : ""}
  </div>
  <div class="saved-answer-list">
    ${intake.promptAnswers
      .map(
        (entry) => `<div class="saved-answer">
  <div class="saved-answer-label">${escapeHtml(entry.prompt)}</div>
  <p class="saved-answer-text">${escapeHtml(entry.response)}</p>
</div>`,
      )
      .join("")}
  </div>
  <div class="voice-assistant-label">Full transcript</div>
  <p>${escapeHtml(intake.transcript)}</p>
  <p class="saved-summary">${escapeHtml(intake.assistantSummary)}</p>
</article>`,
    )
    .join("");
};

const renderAgentSquadStatus = async () => {
  const status = await fetchAgentSquadDemoStatus(
    currentVoice().sessionId ?? undefined,
  );
  const handoff = status?.lastHandoff;
  agentSquadRoot.innerHTML = `<span class="voice-framework-pill">Agent Squad</span>
<h2>Specialist routing is live</h2>
<p class="voice-footnote">Say “I have a billing question about my invoice” to route from the front desk to billing with a compact context policy.</p>
<div class="voice-routing-grid">
  <div><span>Current specialist</span><strong>${escapeHtml(status?.currentAgentId ?? "front-desk")}</strong></div>
  <div><span>Context policy</span><strong>${escapeHtml(status?.contextPolicy ?? "handoff-summary-current-turn")}</strong></div>
  <div><span>Handoffs</span><strong>${status?.handoffCount ?? 0}</strong></div>
  <div><span>Messages sent</span><strong>${escapeHtml(String(status?.messageCount ?? "ready"))}</strong></div>
</div>
<p class="voice-footnote">${
    handoff
      ? `${escapeHtml(handoff.fromAgentId ?? "?")} → ${escapeHtml(handoff.targetAgentId ?? "?")}: ${escapeHtml(handoff.summary ?? handoff.reason ?? "handoff applied")}`
      : "No specialist handoff in this session yet."
  }</p>
<p class="voice-footnote"><a href="/agent-squad-contract">Open squad contract proof</a></p>`;
};

const render = () => {
  const voice = currentVoice();
  connectionMetric.textContent = voice.isConnected ? "Connected" : "Waiting";
  errorStatus.textContent = micError || voice.error || "None";
  microphoneStatus.textContent = isCapturing
    ? VOICE_DEMO_MIC_LIVE
    : VOICE_DEMO_MIC_IDLE;
  promptStatus.textContent = getVoiceModePrompt({
    hasStarted:
      (activeMode ? hasStartedModes[activeMode] : false) ||
      voice.turns.length > 0,
    mode: activeMode,
    status: voice.status,
    turnCount: voice.turns.length,
  });
  startGuidedButton.hidden = isCapturing;
  startGeneralButton.hidden = isCapturing;
  stopButton.hidden = !isCapturing;
  startGuidedButton.textContent = VOICE_DEMO_GUIDED_LABEL;
  startGeneralButton.textContent = VOICE_DEMO_GENERAL_LABEL;
  stopButton.textContent = VOICE_DEMO_STOP_LABEL;
  partialStatus.textContent = voice.partial || "No speech captured yet";
  callLifecycleStatus.textContent = voice.call?.disposition
    ? `${voice.call.disposition} after ${voice.call.events.length} lifecycle event${voice.call.events.length === 1 ? "" : "s"}`
    : (voice.call?.events.at(-1)?.type ?? "Not started");
  modelProviderMetric.textContent = getVoiceProviderLabel(modelProvider);
  routingModeMetric.textContent = getVoiceRoutingLabel(routingMode);
  const profileSwitchGuardDecision = getVoiceProfileSwitchGuardDecision(
    voice.sessionMetadata,
  );
  profileSwitchGuardMetric.textContent = formatVoiceProfileSwitchGuardLabel(
    profileSwitchGuardDecision,
  );
  profileSwitchGuardSummary.textContent = formatVoiceProfileSwitchGuardSummary(
    profileSwitchGuardDecision,
  );
  routingModeCopy.textContent = `${getVoiceProfileLabel(profileId)} uses ${
    VOICE_PROFILES.find((item) => item.id === profileId)?.description ??
    "the selected real-call defaults."
  }`;
  sessionMetric.textContent = activeMode
    ? getVoiceModeLabel(activeMode)
    : "Choose one";
  voiceStatus.textContent = voice.status;
  reconnectStatus.textContent = formatReconnectState(voice.reconnect);
  renderWave();
  renderChat();
  liveLatencyProofHost.innerHTML = renderDemoLiveTurnLatencyHTML(
    liveLatencyEvidence.getSnapshot(),
  );
};

callControlRoot.innerHTML = VOICE_CALL_CONTROL_ACTIONS.map(
  (action) =>
    `<button data-call-action="${escapeHtml(action.action)}" type="button">${escapeHtml(action.label)}</button>`,
).join("");

callControlRoot.addEventListener("click", (event) => {
  const button = event.target;
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const action = VOICE_CALL_CONTROL_ACTIONS.find(
    (item) => item.action === button.dataset.callAction,
  );
  if (!action) {
    return;
  }

  currentVoice().callControl(action);
  stopMic();
});

modelProviderSelect.addEventListener("change", () => {
  stopMic();
  rememberVoiceModelProvider(modelProviderSelect.value as VoiceModelProvider);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("provider", modelProviderSelect.value);
  window.location.href = nextUrl.toString();
});

voiceProfileSelect.addEventListener("change", () => {
  stopMic();
  rememberVoiceProfileId(voiceProfileSelect.value as VoiceProfileId);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("voiceProfile", voiceProfileSelect.value);
  window.location.href = nextUrl.toString();
});

routingModeSelect.addEventListener("change", () => {
  stopMic();
  rememberVoiceRoutingMode(routingModeSelect.value as VoiceRoutingMode);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("routing", routingModeSelect.value);
  window.location.href = nextUrl.toString();
});

speechEngineSelect.addEventListener("change", () => {
  stopMic();
  speechEngine = speechEngineSelect.value as VoiceSpeechEngine;
  rememberVoiceSpeechEngine(speechEngine);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("engine", speechEngine);
  window.location.href = nextUrl.toString();
});

const stopMic = () => {
  microphone.stop();
  isCapturing = false;
  micError = null;
  waveLevels = createInitialVoiceWaveLevels();
  render();
};

const startMode = async (mode: VoiceDemoMode) => {
  activeMode = mode;
  hasStartedModes = {
    ...hasStartedModes,
    [mode]: true,
  };
  try {
    await microphone.start();
    micError = null;
    isCapturing = true;
    render();
  } catch (error) {
    microphone.stop();
    isCapturing = false;
    waveLevels = createInitialVoiceWaveLevels();
    micError = formatErrorMessage(error);
    render();
  }
};

guidedVoice.subscribe(() => {
  bargeInEvidence.syncAssistantOutput();
  liveLatencyEvidence.syncAssistantOutput();
  render();
  void renderAgentSquadStatus();
  if (guidedVoice.status === "completed") {
    void renderSavedIntakes();
  }
});

generalVoice.subscribe(() => {
  bargeInEvidence.syncAssistantOutput();
  liveLatencyEvidence.syncAssistantOutput();
  render();
  void renderAgentSquadStatus();
  if (generalVoice.status === "completed") {
    void renderSavedIntakes();
  }
});

startGuidedButton.addEventListener("click", () => {
  void startMode("guided");
});

startGeneralButton.addEventListener("click", () => {
  void startMode("general");
});

stopButton.addEventListener("click", () => {
  stopMic();
});

window.addEventListener("beforeunload", () => {
  microphone.stop();
  guidedVoice.close();
  generalVoice.close();
  profileComparison.close();
  reconnectEvidence.close();
  profileSwitchRecommendation.close();
});

render();
void renderSavedIntakes();
void renderAgentSquadStatus();
const agentSquadRefreshTimer = window.setInterval(() => {
  void renderAgentSquadStatus();
}, 3_000);
window.addEventListener("beforeunload", () => {
  window.clearInterval(agentSquadRefreshTimer);
  opsStatus.close();
  proofTrends.close();
  readinessFailures.close();
  platformCoverage.close();
  unsubscribePlatformCoverage();
  providerCapabilities.close();
  providerContracts.close();
  campaignDialerProof.close();
  unsubscribeCampaignDialerProof();
  providerSimulation.close();
  providerStatus.close();
  routingStatus.close();
  turnQuality.close();
  realCallWorkerHealth.close();
  bargeInProof.close();
});
