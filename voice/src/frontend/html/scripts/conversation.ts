import {
  fetchAgentSquadDemoStatus,
  fetchSavedIntakes,
  formatDateTime,
  formatReconnectState,
} from "../../../shared/browser";
import {
  VOICE_DEMO_GENERAL_LABEL,
  VOICE_DEMO_GUIDED_LABEL,
  VOICE_DEMO_MIC_IDLE,
  VOICE_DEMO_MIC_LIVE,
  VOICE_DEMO_STOP_LABEL,
} from "../../../constants/demoCopy";
import { VOICE_PROFILES } from "../../../constants/voiceOptions";
import {
  formatVoiceProfileSwitchGuardLabel,
  formatVoiceProfileSwitchGuardSummary,
  getVoiceLeadMessage,
  getVoiceModeLabel,
  getVoiceModePrompt,
  getVoiceProfileLabel,
  getVoiceProfileSwitchGuardDecision,
  getVoiceProviderLabel,
  getVoiceRoutingLabel,
} from "../../../shared/demo";
import type {
  VoiceDemoMode,
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
} from "../../../types/voice";
import { escapeHtml } from "./format";
import type { VoiceDemoElements } from "./dom";
import type { VoiceDemoStream } from "./streams";

export const AGENT_SQUAD_REFRESH_INTERVAL_MS = 3_000;

type HtmxWindow = Window & {
  htmx?: {
    trigger: (target: string | Element, event: string) => void;
  };
};

type ConversationRendererInput = {
  currentVoice: () => VoiceDemoStream;
  elements: VoiceDemoElements;
  framework: string;
  getActiveMode: () => VoiceDemoMode | null;
  getHasStarted: () => boolean;
  getIsCapturing: () => boolean;
  getMicError: () => string | null;
  modelProvider: VoiceModelProvider;
  profileId: VoiceProfileId;
  renderLiveLatency: () => void;
  renderWave: () => void;
  routingMode: VoiceRoutingMode;
};

export const createConversationRenderer = (
  input: ConversationRendererInput,
) => {
  const {
    currentVoice,
    elements,
    framework,
    getActiveMode,
    getHasStarted,
    getIsCapturing,
    getMicError,
    modelProvider,
    profileId,
    renderLiveLatency,
    renderWave,
    routingMode,
  } = input;

  const renderChat = () => {
    const voice = currentVoice();
    const activeMode = getActiveMode();
    const leadMessage = getVoiceLeadMessage({
      hasStarted: getHasStarted() || voice.turns.length > 0,
      mode: activeMode,
      status: voice.status,
      turnCount: voice.turns.length,
    });

    elements.chatList.innerHTML = `<article class="voice-chat-message assistant">
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
    elements.intakesMetric.textContent = String(intakes.length);

    if (framework === "htmx") {
      const htmxWindow = window as unknown as HtmxWindow;

      if (htmxWindow.htmx) {
        htmxWindow.htmx.trigger(document.body, "refresh");
      }

      return;
    }

    if (intakes.length === 0) {
      elements.savedIntakesRoot.innerHTML = `<p class="empty-copy">No saved captures yet.</p>`;

      return;
    }

    elements.savedIntakesRoot.innerHTML = intakes
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
    elements.agentSquadRoot.innerHTML = `<span class="voice-framework-pill">Agent Squad</span>
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
    const activeMode = getActiveMode();
    const isCapturing = getIsCapturing();
    const micError = getMicError();
    elements.connectionMetric.textContent = voice.isConnected
      ? "Connected"
      : "Waiting";
    elements.errorStatus.textContent = micError || voice.error || "None";
    elements.microphoneStatus.textContent = isCapturing
      ? VOICE_DEMO_MIC_LIVE
      : VOICE_DEMO_MIC_IDLE;
    elements.promptStatus.textContent = getVoiceModePrompt({
      hasStarted: getHasStarted() || voice.turns.length > 0,
      mode: activeMode,
      status: voice.status,
      turnCount: voice.turns.length,
    });
    elements.startGuidedButton.hidden = isCapturing;
    elements.startGeneralButton.hidden = isCapturing;
    elements.stopButton.hidden = !isCapturing;
    elements.startGuidedButton.textContent = VOICE_DEMO_GUIDED_LABEL;
    elements.startGeneralButton.textContent = VOICE_DEMO_GENERAL_LABEL;
    elements.stopButton.textContent = VOICE_DEMO_STOP_LABEL;
    elements.partialStatus.textContent =
      voice.partial || "No speech captured yet";
    elements.callLifecycleStatus.textContent = voice.call?.disposition
      ? `${voice.call.disposition} after ${voice.call.events.length} lifecycle event${voice.call.events.length === 1 ? "" : "s"}`
      : (voice.call?.events.at(-1)?.type ?? "Not started");
    elements.modelProviderMetric.textContent =
      getVoiceProviderLabel(modelProvider);
    elements.routingModeMetric.textContent = getVoiceRoutingLabel(routingMode);
    const profileSwitchGuardDecision = getVoiceProfileSwitchGuardDecision(
      voice.sessionMetadata,
    );
    elements.profileSwitchGuardMetric.textContent =
      formatVoiceProfileSwitchGuardLabel(profileSwitchGuardDecision);
    elements.profileSwitchGuardSummary.textContent =
      formatVoiceProfileSwitchGuardSummary(profileSwitchGuardDecision);
    elements.routingModeCopy.textContent = `${getVoiceProfileLabel(profileId)} uses ${
      VOICE_PROFILES.find((item) => item.id === profileId)?.description ??
      "the selected real-call defaults."
    }`;
    elements.sessionMetric.textContent = activeMode
      ? getVoiceModeLabel(activeMode)
      : "Choose one";
    elements.voiceStatus.textContent = voice.status;
    elements.reconnectStatus.textContent = formatReconnectState(
      voice.reconnect,
    );
    renderWave();
    renderChat();
    renderLiveLatency();
  };

  return {
    render,
    renderAgentSquadStatus,
    renderChat,
    renderSavedIntakes,
  };
};
