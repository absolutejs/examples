import type { RAGAdminActionRecord, RAGAdminJobRecord } from "@absolutejs/rag";
import { buildRAGCitations, buildRAGSourceSummaries } from "@absolutejs/rag/ui";
import {
  buildCitationGroups,
  buildSourceSummarySectionGroups,
  buildTracePresentation,
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

export type RAGBackendCapabilities = {
  backend: string;
  persistence: string;
  nativeVectorSearch: boolean;
  serverSideFiltering: boolean;
  streamingIngestStatus: boolean;
};

export type RAGVectorStoreStatus = {
  backend: string;
  vectorMode: string;
  dimensions?: number;
  native?: {
    active: boolean;
    fallbackReason?: string;
  };
};

export type RAGSource = {
  chunkId: string;
  score: number;
  text: string;
  title?: string;
  source?: string;
};

const STREAM_STAGES = [
  "submitting",
  "retrieving",
  "retrieved",
  "streaming",
  "complete",
] as const;

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

export const renderTracePanel = ({
  title,
  summary,
  trace,
}: {
  title: string;
  summary: string;
  trace?: Parameters<typeof buildTracePresentation>[0];
}) => {
  if (!trace) {
    return "";
  }

  const presentation = buildTracePresentation(trace);
  return [
    '<div class="demo-results">',
    `<h4>${escapeHtml(title)}</h4>`,
    `<p class="demo-metadata">${escapeHtml(summary)}</p>`,
    '<div class="demo-stat-grid">',
    presentation.stats
      .map(
        (row) =>
          `<article class="demo-stat-card"><p class="demo-section-caption">${escapeHtml(row.label)}</p><strong>${escapeHtml(row.value)}</strong></article>`,
      )
      .join(""),
    "</div>",
    "<div>",
    presentation.details
      .map(
        (row) =>
          `<p class="demo-key-value-row"><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span></p>`,
      )
      .join(""),
    "</div>",
    '<div class="demo-result-grid">',
    presentation.steps
      .map(
        (step, index) => `
          <details class="demo-collapsible demo-result-item" ${index === 0 ? "open" : ""}>
            <summary><strong>${index + 1}. ${escapeHtml(step.label)}</strong></summary>
            ${step.rows.map((row) => `<p class="demo-key-value-row"><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span></p>`).join("")}
          </details>`,
      )
      .join(""),
    "</div>",
    "</div>",
  ].join("");
};

export const renderStageRow = (currentStage: (typeof STREAM_STAGES)[number]) =>
  `<div class="demo-stage-row">${STREAM_STAGES.map((stage) => {
    const classNames = ["demo-stage-pill"];

    if (stage === "complete") {
      classNames.push("complete");
    }

    if (stage === currentStage) {
      classNames.push("current");
    }

    return `<span class="${classNames.join(" ")}">${escapeHtml(stage)}</span>`;
  }).join("")}</div>`;

export const renderCapabilities = (capabilities?: RAGBackendCapabilities) => {
  if (!capabilities) {
    return '<p class="demo-metadata">Backend capabilities unavailable.</p>';
  }

  const values = [
    capabilities.backend,
    capabilities.persistence,
    capabilities.nativeVectorSearch
      ? "native vector search"
      : "managed fallback search",
    capabilities.serverSideFiltering
      ? "server-side filters"
      : "client-side filters",
    capabilities.streamingIngestStatus
      ? "streaming ingest status"
      : "polled ingest status",
  ];

  return `<p class="demo-metadata">Backend capabilities: <strong>${escapeHtml(values.join(" · "))}</strong></p>`;
};

export const renderNativeSource = (status?: RAGVectorStoreStatus) => {
  const native = status?.native;
  if (!native || !native.active) {
    return "Not applicable";
  }

  if (status?.backend === "sqlite") {
    return "Packaged sqlite-vec";
  }

  if (status?.backend === "postgres") {
    return "PostgreSQL pgvector extension";
  }

  return "Managed by AbsoluteJS";
};

export const renderStatusSummary = (status?: RAGVectorStoreStatus) => {
  if (!status) {
    return "No backend status is available.";
  }

  if (status.native?.active) {
    return "Native vector acceleration is active.";
  }

  if (status.vectorMode === "json_fallback") {
    return "Owned JSON fallback retrieval is active.";
  }

  return `Vector mode ${status.vectorMode} is active.`;
};

export const renderStatusMessage = (status?: RAGVectorStoreStatus) => {
  if (!status) {
    return "Backend status unavailable.";
  }

  return status.native?.fallbackReason ?? renderStatusSummary(status);
};

export const renderAdminJobCards = (jobs?: RAGAdminJobRecord[]) => {
  const records = (jobs ?? []).slice(0, 3);
  if (records.length === 0) {
    return '<p class="demo-metadata">No admin jobs recorded yet.</p>';
  }

  return `<div class="demo-stat-grid">${records
    .map((job) => {
      const target = job.target ?? "global";
      const timing =
        typeof job.startedAt === "number" ? formatTime(job.startedAt) : "n/a";

      return `<article class="demo-stat-card">
        <span class="demo-stat-label">${escapeHtml(job.action)}</span>
        <strong>${escapeHtml(job.status.toUpperCase())}</strong>
        <p>${escapeHtml(target)}</p>
        <div class="demo-key-value-list">
          <div class="demo-key-value-row"><span>Started</span><strong>${escapeHtml(timing)}</strong></div>
          ${typeof job.elapsedMs === "number" ? `<div class="demo-key-value-row"><span>Elapsed</span><strong>${escapeHtml(formatDuration(job.elapsedMs))}</strong></div>` : ""}
        </div>
      </article>`;
    })
    .join("")}</div>`;
};

export const renderAdminActionCards = (actions?: RAGAdminActionRecord[]) => {
  const records = (actions ?? []).slice(0, 3);
  if (records.length === 0) {
    return '<p class="demo-metadata">No admin actions recorded yet.</p>';
  }

  return `<div class="demo-stat-grid">${records
    .map((action) => {
      const target = action.documentId ?? action.target ?? "global";
      const timing =
        typeof action.elapsedMs === "number"
          ? formatDuration(action.elapsedMs)
          : typeof action.startedAt === "number"
            ? formatTime(action.startedAt)
            : "n/a";

      return `<article class="demo-stat-card">
        <span class="demo-stat-label">${escapeHtml(action.action)}</span>
        <strong>${escapeHtml(action.status.toUpperCase())}</strong>
        <p>${escapeHtml(target)}</p>
        <div class="demo-key-value-list">
          <div class="demo-key-value-row"><span>When</span><strong>${escapeHtml(timing)}</strong></div>
        </div>
      </article>`;
    })
    .join("")}</div>`;
};

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

export const renderDetailList = (lines: string[], fallback: string) => {
  const values = lines.length > 0 ? lines : [fallback];
  return `<ul class="demo-detail-list">${values.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
};

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
