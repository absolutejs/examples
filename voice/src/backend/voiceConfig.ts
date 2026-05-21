import { type SavedIntake } from "../shared/demo";
import { VOICE_DEMO_PHRASE_HINTS, buildSavedIntake } from "./voiceFlow";
import {
  createVoiceConfiguration,
  type VoiceSessionRecord,
  voice,
} from "@absolutejs/voice";

import { correctDemoTurn } from "./agentSquad";
import { handoffAdapters } from "./carrierHandoff";
import { persistIntake } from "./contracts";

import {
  escapeHtml,
  formatCallDisposition,
  renderPromptAnswers,
} from "./helpers";

import { createDemoProfileSwitchGuard } from "./observabilityExport";
import { assistant, liveOpsRuntime } from "./profileSwitch";

import { contractAwareOnTurn } from "./proofSuite";
import { rememberSessionRoutingMode } from "./providers";

import { sttAdapter } from "./realCallEvidence";

import { handoffDeliveryStore, runtimeStorage } from "./stores";

import { voiceSurfaces } from "./voiceSurfaces";

export const voiceConfig = createVoiceConfiguration<
  unknown,
  VoiceSessionRecord,
  SavedIntake
>({
  htmx: ({ result }) => {
    if (!result) {
      return `<p class="empty-copy">No saved captures yet.</p>`;
    }

    return `<article class="saved-item">
  <div class="saved-item-header">
    <strong>${escapeHtml(result.title)}</strong>
    <span>${new Date(result.completedAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })}</span>
  </div>
  <p>${escapeHtml(result.transcript)}</p>
  <div class="saved-item-meta">
    <span class="pill">${escapeHtml(result.scenarioId === "guided" ? "Guided test" : "General recording")}</span>
    <span class="pill">${result.turnCount} turn${result.turnCount === 1 ? "" : "s"}</span>
    ${result.callDisposition ? `<span class="pill">${escapeHtml(formatCallDisposition(result.callDisposition) ?? result.callDisposition)}</span>` : ""}
    ${result.callTarget ? `<span class="pill">${escapeHtml(result.callTarget)}</span>` : ""}
    ${result.detectedName ? `<span class="pill">${escapeHtml(result.detectedName)}</span>` : ""}
  </div>
  <div class="saved-answer-list">
    ${renderPromptAnswers(result.promptAnswers)}
  </div>
  <div class="voice-assistant-label">Full transcript</div>
  <p>${escapeHtml(result.transcript)}</p>
  <p class="saved-summary">${escapeHtml(result.assistantSummary)}</p>
</article>`;
  },
  onComplete: async ({ session }) => {
    const result = session.turns
      .toReversed()
      .find((turn) => turn.result !== undefined)?.result as
      | SavedIntake
      | undefined;
    const savedIntake = result ?? buildSavedIntake(session);
    persistIntake(savedIntake);
  },
  handoff:
    handoffAdapters.length > 0
      ? {
          adapters: handoffAdapters,
          deliveryQueue: handoffDeliveryStore,
        }
      : undefined,
  ops: assistant.ops,
  correctTurn: correctDemoTurn,
  phraseHints: async (input) => {
    await rememberSessionRoutingMode(input);
    return VOICE_DEMO_PHRASE_HINTS;
  },
  profileSwitchGuard: createDemoProfileSwitchGuard("/voice/intake"),
  onTurn: contractAwareOnTurn,
  path: "/voice/intake",
  preset: "reliability",
  session: runtimeStorage.session,
  stt: sttAdapter,
  liveOps: liveOpsRuntime,
  ...voiceSurfaces,
});
