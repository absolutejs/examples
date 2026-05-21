import {
  createVoiceConfiguration,
  type VoiceSessionRecord,
} from "@absolutejs/voice";
import { type SavedIntake } from "../shared/demo";
import { channelDefaults } from "./channelDefaults";
import {
  escapeHtml,
  formatCallDisposition,
  renderPromptAnswers,
} from "./helpers";
import { sttAdapter } from "./realCallEvidence";
import { voiceSurfaces } from "./voiceSurfaces";

export const voiceConfig = createVoiceConfiguration<
  unknown,
  VoiceSessionRecord,
  SavedIntake
>({
  ...channelDefaults("/voice/intake"),
  path: "/voice/intake",
  stt: sttAdapter,
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
  ...voiceSurfaces,
});
