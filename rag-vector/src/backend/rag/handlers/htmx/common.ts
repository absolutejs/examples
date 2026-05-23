import {
  buildRAGCitations,
  buildRAGSourceSummaries,
  resolveRAGHTMXRenderers,
} from "@absolutejs/rag/ui";
import {
  buildCitationGroups,
  buildSourceSummarySectionGroups,
  formatCitationDetails,
  formatCitationExcerpt,
  formatCitationLabel,
  formatCitationSummary,
  formatSectionDiagnosticAttributionFocus,
  formatSectionDiagnosticChannels,
  formatSectionDiagnosticCompetition,
  formatSectionDiagnosticDistributionRows,
  formatSectionDiagnosticPipeline,
  formatSectionDiagnosticReasons,
  formatSectionDiagnosticStageBounds,
  formatSectionDiagnosticStageFlow,
  formatSectionDiagnosticStageWeightReasons,
  formatSectionDiagnosticStageWeightRows,
  formatSectionDiagnosticTopEntry,
  formatSourceSummaryDetails,
} from "../../../../frontend/demo-backends";

export type {
  RAGBackendCapabilities,
  RAGVectorStoreStatus,
} from "@absolutejs/rag";

export type RAGSource = {
  chunkId: string;
  score: number;
  text: string;
  title?: string;
  source?: string;
};

// Self-contained HTMX fragment renderers now live in @absolutejs/rag; resolve
// them with the example's `demo-` class prefix so the existing stylesheet keeps
// working, and re-export under the original names below.
const htmxRenderers = resolveRAGHTMXRenderers({ classPrefix: "demo" });

export const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const formatScore = (value: number) =>
  Number.isFinite(value) ? value.toFixed(3) : "0.000";

export const formatTime = (timestamp?: number) => {
  if (!timestamp) {
    return "n/a";
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const formatDuration = (durationMs?: number) => {
  if (typeof durationMs !== "number" || durationMs < 0) {
    return "n/a";
  }

  return `${durationMs}ms`;
};

export const renderTracePanel = htmxRenderers.tracePanel;

export const renderStageRow = htmxRenderers.stageRow;

export const renderCapabilities = htmxRenderers.capabilities;

export const renderNativeSource = htmxRenderers.nativeSource;

export const renderStatusSummary = htmxRenderers.statusSummary;

export const renderStatusMessage = htmxRenderers.statusMessage;

export const renderAdminJobCards = htmxRenderers.adminJobCards;

export const renderAdminActionCards = htmxRenderers.adminActionCards;

export const renderSourceSummaries = (sources: RAGSource[]) => {
  const summaries = buildRAGSourceSummaries(sources);
  if (summaries.length === 0) {
    return '<p class="demo-metadata">Retrieved source groups: 0</p>';
  }

  const groups = buildSourceSummarySectionGroups(summaries);
  return [
    `<p class="demo-metadata">Retrieved source groups: ${summaries.length}</p>`,
    '<div class="demo-result-grid">',
    groups
      .map(
        (group) => `
          <article class="demo-result-item" id="${escapeHtml(group.targetId)}">
            <h3>${escapeHtml(group.label)}</h3>
            <p class="demo-result-source">${escapeHtml(group.summary)}</p>
            <div class="demo-result-grid">
              ${group.summaries
                .map(
                  (summary) => `
                    <article class="demo-result-item">
                      <h4>${escapeHtml(summary.label)}</h4>
                      ${formatSourceSummaryDetails(summary)
                        .map(
                          (line) =>
                            `<p class="demo-metadata">${escapeHtml(line)}</p>`,
                        )
                        .join("")}
                      <p class="demo-result-text">${escapeHtml(summary.excerpt)}</p>
                    </article>`,
                )
                .join("")}
            </div>
          </article>`,
      )
      .join(""),
    "</div>",
  ].join("");
};

export const renderCitations = (sources: RAGSource[]) => {
  const citations = buildRAGCitations(sources);
  if (citations.length === 0) {
    return "";
  }

  return [
    '<div class="demo-results">',
    "<h4>Citation Trail</h4>",
    '<p class="demo-metadata">Each citation maps a concrete retrieved chunk to a stable reference number you can carry into the answer UI.</p>',
    '<div class="demo-result-grid">',
    buildCitationGroups(citations)
      .map(
        (group) => `
          <article class="demo-result-item" id="${escapeHtml(group.targetId)}">
            <h3>${escapeHtml(group.label)}</h3>
            <p class="demo-result-source">${escapeHtml(group.summary)}</p>
            <div class="demo-result-grid">
              ${group.citations
                .map(
                  (citation, index) => `
                    <article class="demo-result-item demo-citation-card">
                      <p class="demo-citation-badge">[${index + 1}] ${escapeHtml(formatCitationLabel(citation))}</p>
                      <p class="demo-result-score">${escapeHtml(formatCitationSummary(citation))}</p>
                      ${formatCitationDetails(citation)
                        .map(
                          (line) =>
                            `<p class="demo-metadata">${escapeHtml(line)}</p>`,
                        )
                        .join("")}
                      <p class="demo-result-text">${escapeHtml(formatCitationExcerpt(citation))}</p>
                    </article>`,
                )
                .join("")}
            </div>
          </article>`,
      )
      .join(""),
    "</div>",
    "</div>",
  ].join("");
};

export const renderDetailList = htmxRenderers.detailList;

export const renderSectionDiagnosticCard = (diagnostic: {
  key: string;
  label: string;
  summary: string;
}) =>
  [
    `<article class="demo-result-item">`,
    `<h4>${escapeHtml(diagnostic.label)}</h4>`,
    `<p class="demo-result-source">${escapeHtml(diagnostic.summary)}</p>`,
    `<p class="demo-metadata">${escapeHtml(formatSectionDiagnosticChannels(diagnostic as never))}</p>`,
    `<p class="demo-metadata">${escapeHtml(formatSectionDiagnosticAttributionFocus(diagnostic as never))}</p>`,
    `<p class="demo-metadata">${escapeHtml(formatSectionDiagnosticPipeline(diagnostic as never))}</p>`,
    `${formatSectionDiagnosticStageFlow(diagnostic as never) ? `<p class="demo-metadata">${escapeHtml(formatSectionDiagnosticStageFlow(diagnostic as never) ?? "")}</p>` : ""}`,
    `${formatSectionDiagnosticStageBounds(diagnostic as never) ? `<p class="demo-metadata">${escapeHtml(formatSectionDiagnosticStageBounds(diagnostic as never) ?? "")}</p>` : ""}`,
    `${formatSectionDiagnosticStageWeightRows(diagnostic as never)
      .map((line: string) => `<p class="demo-metadata">${escapeHtml(line)}</p>`)
      .join("")}`,
    `<p class="demo-metadata">${escapeHtml(formatSectionDiagnosticTopEntry(diagnostic as never))}</p>`,
    `${formatSectionDiagnosticCompetition(diagnostic as never) ? `<p class="demo-metadata">${escapeHtml(formatSectionDiagnosticCompetition(diagnostic as never) ?? "")}</p>` : ""}`,
    `${[...formatSectionDiagnosticReasons(diagnostic as never), ...formatSectionDiagnosticStageWeightReasons(diagnostic as never)].length > 0 ? `<div class="demo-badge-row">${[...formatSectionDiagnosticReasons(diagnostic as never), ...formatSectionDiagnosticStageWeightReasons(diagnostic as never)].map((reason) => `<span class="demo-state-chip">${escapeHtml(reason)}</span>`).join("")}</div>` : ""}`,
    `${formatSectionDiagnosticDistributionRows(diagnostic as never)
      .map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`)
      .join("")}`,
    `</article>`,
  ].join("");
