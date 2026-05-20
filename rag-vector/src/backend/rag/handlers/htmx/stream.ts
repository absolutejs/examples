import {
  createRAGHTMXWorkflowRenderConfig,
  type AIHTMXRenderConfig,
  type RAGEvaluationCaseResult,
  type RAGEvaluationSummary,
  type RAGGroundedAnswerPart,
  type RAGGroundedAnswerSectionSummary,
  type RAGHTMXWorkflowRenderConfig,
} from "@absolutejs/rag";
import {
  buildRAGGroundedAnswer,
  buildRAGGroundingReferences,
  buildRAGSourceGroups,
} from "@absolutejs/rag/ui";
import {
  DEMO_RERANKER_LABEL,
  DEMO_RERANKER_SUMMARY,
  benchmarkOutcomeRail,
  buildSearchResponse,
  buildSearchSectionGroups,
  formatDemoMetadataSummary,
  formatFailureSummary,
  formatGroundedAnswerPartDetails,
  formatGroundedAnswerPartExcerpt,
  formatGroundedAnswerSectionSummaryDetails,
  formatGroundedAnswerSectionSummaryExcerpt,
  formatGroundingCoverage,
  formatGroundingPartReferences,
  formatGroundingReferenceDetails,
  formatGroundingReferenceExcerpt,
  formatGroundingReferenceLabel,
  formatGroundingReferenceSummary,
  formatGroundingSummary,
} from "../../../../frontend/demo-backends";
import {
  escapeHtml,
  formatDuration,
  formatScore,
  formatTime,
  renderCapabilities,
  renderCitations,
  renderDetailList,
  renderNativeSource,
  renderSectionDiagnosticCard,
  renderSourceSummaries,
  renderStageRow,
  renderStatusMessage,
  renderStatusSummary,
  renderTracePanel,
  type RAGBackendCapabilities,
  type RAGSource,
  type RAGVectorStoreStatus,
} from "./common";

const renderEvaluationResults = (
  cases: RAGEvaluationCaseResult[],
  summary: RAGEvaluationSummary,
) => {
  if (cases.length === 0) {
    return '<p class="demo-metadata">No evaluation results available.</p>';
  }

  const passingRate =
    summary.totalCases > 0
      ? ((summary.passedCases / summary.totalCases) * 100).toFixed(1)
      : "0.0";

  return [
    `<p class="demo-metadata">Benchmark summary: ${summary.passedCases}/${summary.totalCases} pass · precision ${(summary.averagePrecision * 100).toFixed(1)}% · recall ${(summary.averageRecall * 100).toFixed(1)}% · f1 ${summary.averageF1.toFixed(3)} · avg latency ${summary.averageLatencyMs.toFixed(1)}ms · passing ${passingRate}%</p>`,
    '<div class="demo-result-grid">',
    cases
      .map(
        (entry) => `
          <article class="demo-result-item demo-evaluation-card demo-evaluation-${escapeHtml(entry.status)}">
            <h4>${escapeHtml(entry.label ?? entry.caseId)}</h4>
            <p class="demo-result-source">${escapeHtml(entry.query)}</p>
            <p class="demo-evaluation-status">${escapeHtml(entry.status.toUpperCase())}</p>
            <p class="demo-metadata">${escapeHtml(
              `${entry.status.toUpperCase()} via ${entry.mode} · matched ${entry.matchedCount}/${entry.expectedCount} · precision ${(entry.precision * 100).toFixed(1)}% · recall ${(entry.recall * 100).toFixed(1)}% · f1 ${entry.f1.toFixed(3)}`,
            )}</p>
            <p class="demo-metadata">expected: ${escapeHtml(entry.expectedIds.join(", "))}</p>
            <p class="demo-metadata">retrieved: ${escapeHtml(entry.retrievedIds.join(", "))}</p>
            <p class="demo-result-text">missing: ${escapeHtml(entry.missingIds.join(", ") || "none")}</p>
          </article>`,
      )
      .join(""),
    "</div>",
  ].join("");
};

const renderIdleWorkflowSummary = () =>
  [
    '<div id="stream-workflow-summary" class="demo-result-grid" hx-swap-oob="outerHTML">',
    '<article class="demo-result-item">',
    "<h4>Workflow Contract</h4>",
    '<ul class="demo-detail-list">',
    "<li>Canonical entry point: HTMX workflow route</li>",
    "<li>Connected page surface: message + SSE transport</li>",
    "<li>Snapshot stage: idle</li>",
    "<li>Live stage field: idle</li>",
    "<li>Snapshot sources: 0</li>",
    "<li>Snapshot running: no</li>",
    "</ul>",
    "</article>",
    '<article class="demo-result-item">',
    "<h4>Workflow Proof</h4>",
    '<ul class="demo-detail-list">',
    "<li>Retrieved: no</li>",
    "<li>Has sources: no</li>",
    "<li>Citation count: 0</li>",
    "<li>Grounding coverage: ungrounded</li>",
    "</ul>",
    "</article>",
    "</div>",
  ].join("");

const renderWorkflowSummary = ({
  stage,
  sourceCount,
  isRunning,
  hasRetrieved,
  citationCount,
  coverage,
}: {
  stage: string;
  sourceCount: number;
  isRunning: boolean;
  hasRetrieved: boolean;
  citationCount: number;
  coverage: string;
}) =>
  [
    '<div id="stream-workflow-summary" class="demo-result-grid" hx-swap-oob="outerHTML">',
    '<article class="demo-result-item">',
    "<h4>Workflow Contract</h4>",
    '<ul class="demo-detail-list">',
    "<li>Canonical entry point: HTMX workflow route</li>",
    "<li>Connected page surface: message + SSE transport</li>",
    `<li>Snapshot stage: ${escapeHtml(stage)}</li>`,
    `<li>Live stage field: ${escapeHtml(stage)}</li>`,
    `<li>Snapshot sources: ${String(sourceCount)}</li>`,
    `<li>Snapshot running: ${isRunning ? "yes" : "no"}</li>`,
    "</ul>",
    "</article>",
    '<article class="demo-result-item">',
    "<h4>Workflow Proof</h4>",
    '<ul class="demo-detail-list">',
    `<li>Retrieved: ${hasRetrieved ? "yes" : "no"}</li>`,
    `<li>Has sources: ${sourceCount > 0 ? "yes" : "no"}</li>`,
    `<li>Citation count: ${String(citationCount)}</li>`,
    `<li>Grounding coverage: ${escapeHtml(coverage)}</li>`,
    "</ul>",
    "</article>",
    "</div>",
  ].join("");

const renderMutationRefreshes = () =>
  [
    '<div id="search-results" class="demo-results" hx-swap-oob="innerHTML"><p class="demo-metadata">Run a search or use a document row action to inspect scoped retrieval.</p></div>',
    '<div id="chunk-preview-body" class="demo-results" hx-swap-oob="innerHTML"><p class="demo-metadata">Pick a document and click Inspect chunks to compare the normalized text with the final chunk boundaries.</p></div>',
  ].join("");

const renderIdleStreamQueryField = () =>
  [
    '<div id="stream-query-field" hx-swap-oob="outerHTML">',
    '<label for="stream-query">Question</label>',
    '<input id="stream-query" name="content" placeholder="e.g. What should I verify after ingesting a new source?" required type="text" />',
    "</div>",
  ].join("");

const renderActiveStreamQueryField = (content: string) =>
  [
    '<div id="stream-query-field" hx-swap-oob="outerHTML">',
    '<label for="stream-query">Question</label>',
    `<input id="stream-query" name="content" disabled type="text" value="${escapeHtml(content)}" />`,
    "</div>",
  ].join("");

const renderIdleStreamControls = () =>
  [
    '<div id="stream-form-controls" class="demo-stream-actions" hx-swap-oob="outerHTML">',
    '<button type="submit">Ask with retrieval stream</button>',
    "</div>",
  ].join("");

const renderActiveStreamControls = (cancelUrl: string) =>
  [
    '<div id="stream-form-controls" class="demo-stream-actions" hx-swap-oob="outerHTML">',
    `<button type="button" class="ai-cancel-button" hx-post="${escapeHtml(cancelUrl)}" hx-target="#stream-form-controls" hx-swap="outerHTML">Cancel</button>`,
    "</div>",
  ].join("");

export const createHtmxAIStreamRenderConfig = (): AIHTMXRenderConfig => {
  let latestRetrievedSources: RAGSource[] = [];

  return {
    messageStart: ({ cancelUrl, content, messageId, sseUrl }) => {
      latestRetrievedSources = [];

      return [
        `<div id="msg-${escapeHtml(messageId)}" class="message user">`,
        `<div>${escapeHtml(content)}</div>`,
        "</div>",
        `<div id="response-${escapeHtml(messageId)}" hx-ext="sse" sse-connect="${escapeHtml(sseUrl)}" hx-swap="innerHTML">`,
        `<div id="sse-retrieval-${escapeHtml(messageId)}" sse-swap="retrieval" hx-swap="innerHTML"></div>`,
        `<div id="sse-sources-${escapeHtml(messageId)}" sse-swap="sources" hx-swap="innerHTML"></div>`,
        `<div id="sse-content-${escapeHtml(messageId)}" sse-swap="content" hx-swap="innerHTML"></div>`,
        `<div id="sse-thinking-${escapeHtml(messageId)}" sse-swap="thinking" hx-swap="innerHTML"></div>`,
        `<div id="sse-tools-${escapeHtml(messageId)}" sse-swap="tools" hx-swap="innerHTML"></div>`,
        `<div id="sse-images-${escapeHtml(messageId)}" sse-swap="images" hx-swap="innerHTML"></div>`,
        `<div id="sse-status-${escapeHtml(messageId)}" sse-swap="status" hx-swap="innerHTML"></div>`,
        "</div>",
        renderWorkflowSummary({
          stage: "submitting",
          sourceCount: 0,
          isRunning: true,
          hasRetrieved: false,
          citationCount: 0,
          coverage: "ungrounded",
        }),
        renderActiveStreamQueryField(content),
        renderActiveStreamControls(cancelUrl),
      ].join("");
    },
    ragRetrieving: (input) => {
      const retrievalStartedAt = input?.retrievalStartedAt;

      return [
        renderWorkflowSummary({
          stage: "retrieving",
          sourceCount: 0,
          isRunning: true,
          hasRetrieved: false,
          citationCount: 0,
          coverage: "ungrounded",
        }),
        '<div class="demo-stream-block">',
        "<h4>Retrieval status</h4>",
        renderStageRow("retrieving"),
        '<dl class="demo-stream-stats">',
        `<div><dt>Retrieval started</dt><dd>${escapeHtml(formatTime(retrievalStartedAt))}</dd></div>`,
        "</dl>",
        '<p class="demo-metadata">Retrieving sources...</p>',
        "</div>",
      ].join("");
    },
    ragRetrieved: (sources, details) => {
      latestRetrievedSources = sources;

      return [
        renderWorkflowSummary({
          stage: "retrieved",
          sourceCount: sources.length,
          isRunning: true,
          hasRetrieved: true,
          citationCount: buildRAGSourceGroups(sources).length,
          coverage: "ungrounded",
        }),
        '<div class="demo-stream-block">',
        "<h4>Retrieved sources</h4>",
        renderStageRow("retrieved"),
        '<dl class="demo-stream-stats">',
        `<div><dt>Retrieval started</dt><dd>${escapeHtml(formatTime(details?.retrievalStartedAt))}</dd></div>`,
        `<div><dt>Retrieval duration</dt><dd>${escapeHtml(formatDuration(details?.retrievalDurationMs))}</dd></div>`,
        `<div><dt>Source groups</dt><dd>${buildRAGSourceGroups(sources).length}</dd></div>`,
        "</dl>",
        renderSourceSummaries(sources),
        renderTracePanel({
          summary:
            "This is the first-class retrieval trace from AbsoluteJS for the streamed workflow path. It shows how retrieval executed before answer generation.",
          title: "Workflow Retrieval Trace",
          trace: details?.trace,
        }),
        renderCitations(sources),
        "</div>",
      ].join("");
    },
    chunk: (_text, fullContent) => {
      const groundedAnswer = buildRAGGroundedAnswer(
        fullContent,
        latestRetrievedSources,
      );
      const groundingReferences = buildRAGGroundingReferences(
        latestRetrievedSources,
      );

      return [
        renderWorkflowSummary({
          stage: "streaming",
          sourceCount: latestRetrievedSources.length,
          isRunning: true,
          hasRetrieved: latestRetrievedSources.length > 0,
          citationCount: latestRetrievedSources.length,
          coverage: groundedAnswer.coverage,
        }),
        '<div class="demo-stream-block">',
        "<h4>Answer</h4>",
        renderStageRow("streaming"),
        `<p class="demo-result-text">${escapeHtml(fullContent)}</p>`,
        "</div>",
        '<div class="demo-results">',
        "<h4>Answer Grounding</h4>",
        `<p class="demo-grounding-badge demo-grounding-${escapeHtml(groundedAnswer.coverage)}">${escapeHtml(formatGroundingCoverage(groundedAnswer.coverage))}</p>`,
        renderDetailList(
          formatGroundingSummary(groundedAnswer),
          "No grounding summary available.",
        ),
        groundedAnswer.parts.some(
          (part: RAGGroundedAnswerPart) => part.type === "citation",
        )
          ? '<div class="demo-result-grid">' +
            groundedAnswer.parts
              .map((part: RAGGroundedAnswerPart) =>
                part.type === "citation"
                  ? `<article class="demo-result-item demo-grounding-card"><p class="demo-citation-badge">${escapeHtml(formatGroundingPartReferences(part.referenceNumbers))}</p>${formatGroundedAnswerPartDetails(
                      part,
                    )
                      .map(
                        (line) =>
                          `<p class="demo-metadata">${escapeHtml(line)}</p>`,
                      )
                      .join(
                        "",
                      )}<p class="demo-result-text">${escapeHtml(formatGroundedAnswerPartExcerpt(part))}</p></article>`
                  : "",
              )
              .join("") +
            "</div>"
          : "",
        "</div>",
        groundedAnswer.sectionSummaries.length > 0
          ? '<div class="demo-results"><h4>Grounding by Section</h4><div class="demo-result-grid">' +
            groundedAnswer.sectionSummaries
              .map(
                (summary: RAGGroundedAnswerSectionSummary) =>
                  `<article class="demo-result-item demo-grounding-card"><h3>${escapeHtml(summary.label)}</h3><p class="demo-result-source">${escapeHtml(summary.summary)}</p>${formatGroundedAnswerSectionSummaryDetails(
                    summary,
                  )
                    .map(
                      (line) =>
                        `<p class="demo-metadata">${escapeHtml(line)}</p>`,
                    )
                    .join(
                      "",
                    )}<p class="demo-result-text">${escapeHtml(formatGroundedAnswerSectionSummaryExcerpt(summary))}</p></article>`,
              )
              .join("") +
            "</div></div>"
          : "",
        groundingReferences.length > 0
          ? '<div class="demo-results"><h4>Grounding Reference Map</h4><p class="demo-metadata">Each reference resolves answer citations back to concrete evidence with page, sheet, slide, archive, or thread context when available.</p><div class="demo-result-grid">' +
            groundingReferences
              .map(
                (reference) =>
                  `<article class="demo-result-item demo-grounding-card"><p class="demo-citation-badge">${escapeHtml(formatGroundingReferenceLabel(reference))}</p><p class="demo-result-score">${escapeHtml(formatGroundingReferenceSummary(reference))}</p>${formatGroundingReferenceDetails(
                    reference,
                  )
                    .map(
                      (line) =>
                        `<p class="demo-metadata">${escapeHtml(line)}</p>`,
                    )
                    .join(
                      "",
                    )}<p class="demo-result-text">${escapeHtml(formatGroundingReferenceExcerpt(reference))}</p></article>`,
              )
              .join("") +
            "</div></div>"
          : "",
      ].join("");
    },
    complete: (usage, durationMs, model) => {
      latestRetrievedSources = [];

      const details = [
        model,
        usage
          ? `${usage.inputTokens} in / ${usage.outputTokens} out`
          : undefined,
        typeof durationMs === "number" ? formatDuration(durationMs) : undefined,
      ].filter(Boolean);

      return [
        renderIdleWorkflowSummary(),
        '<div class="demo-stream-block">',
        "<h4>Status</h4>",
        renderStageRow("complete"),
        `<p class="demo-metadata">${escapeHtml(details.length > 0 ? details.join(" · ") : "Complete")}</p>`,
        "</div>",
        renderIdleStreamQueryField(),
        renderIdleStreamControls(),
      ].join("");
    },
    thinking: (text) =>
      [
        '<details class="demo-stream-block">',
        "<summary>Thinking</summary>",
        `<p class="demo-result-text">${escapeHtml(text)}</p>`,
        "</details>",
      ].join(""),
    toolRunning: (name) =>
      `<div class="demo-stream-block"><h4>Tool</h4><p class="demo-metadata">Running ${escapeHtml(name)}...</p></div>`,
    toolComplete: (name, result) =>
      `<details class="demo-stream-block"><summary>Tool complete: ${escapeHtml(name)}</summary><pre class="demo-result-text">${escapeHtml(result)}</pre></details>`,
    canceled: () => {
      latestRetrievedSources = [];

      return [
        renderIdleWorkflowSummary(),
        '<div class="ai-canceled">Canceled.</div>',
        renderIdleStreamQueryField(),
        renderIdleStreamControls(),
      ].join("");
    },
    error: (message) => {
      latestRetrievedSources = [];

      return [
        renderIdleWorkflowSummary(),
        '<div class="demo-stream-block">',
        `<p class="demo-error">${escapeHtml(message)}</p>`,
        "</div>",
        renderIdleStreamQueryField(),
        renderIdleStreamControls(),
      ].join("");
    },
  };
};

export const createHtmxWorkflowRenderConfig = (
  ragPath: string,
): RAGHTMXWorkflowRenderConfig =>
  createRAGHTMXWorkflowRenderConfig({
    status: ({ status, capabilities, documents }) => {
      if (!status) {
        return '<p class="demo-error">No backend status is available.</p>';
      }

      return [
        '<div class="demo-htmx-status">',
        '<dl class="demo-stat-grid">',
        `<div><dt>Backend</dt><dd>${escapeHtml(status.backend)}</dd></div>`,
        `<div><dt>Vector mode</dt><dd>${escapeHtml(status.vectorMode)}</dd></div>`,
        `<div><dt>Embedding dimensions</dt><dd>${status.dimensions ?? "n/a"}</dd></div>`,
        `<div><dt>Vector acceleration</dt><dd>${status.native?.active ? "active" : "inactive"}</dd></div>`,
        `<div><dt>Native source</dt><dd>${escapeHtml(renderNativeSource(status as RAGVectorStoreStatus))}</dd></div>`,
        `<div><dt>Documents</dt><dd>${documents?.total ?? "n/a"}</dd></div>`,
        `<div><dt>Total chunks</dt><dd>${documents?.chunkCount ?? "n/a"}</dd></div>`,
        `<div><dt>Seed docs</dt><dd>${documents?.byKind.seed ?? 0}</dd></div>`,
        `<div><dt>Custom docs</dt><dd>${documents?.byKind.custom ?? 0}</dd></div>`,
        `<div><dt>Reranker</dt><dd>${escapeHtml(DEMO_RERANKER_LABEL)}</dd></div>`,
        "</dl>",
        `<p class="demo-note">${escapeHtml(renderStatusSummary(status as RAGVectorStoreStatus))}</p>`,
        `<p class="demo-metadata">${escapeHtml(renderStatusMessage(status as RAGVectorStoreStatus))}</p>`,
        `<p class="demo-metadata">${escapeHtml(DEMO_RERANKER_SUMMARY)}</p>`,
        renderCapabilities(capabilities as RAGBackendCapabilities),
        "</div>",
      ].join("");
    },
    searchResults: ({ query, results, trace }) => {
      const traceSummary = renderTracePanel({
        summary:
          "This is the first-class retrieval trace from AbsoluteJS. It shows how the query was transformed, which retrieval stages ran, and how many candidates survived each step.",
        title: "Retrieval Trace",
        trace,
      });

      if (results.length === 0) {
        return [
          '<div class="demo-results">',
          `<p id="search-count">0 results for “${escapeHtml(query)}”</p>`,
          '<div class="demo-result-grid"><p>No matching chunks.</p></div>',
          "</div>",
          traceSummary,
        ].join("");
      }

      const response = buildSearchResponse(query, {}, results, 0, trace);
      const sectionGroups = buildSearchSectionGroups(response);

      return [
        '<div class="demo-results">',
        `<p id="search-count">${results.length} results for “${escapeHtml(query)}”</p>`,
        '<p class="demo-metadata">Reranking is active: AbsoluteJS reorders the first vector hits with the built-in heuristic provider before these results render.</p>',
        response.storyHighlights.length > 0
          ? `<div class="demo-results"><h3>Retrieval Story</h3>${response.storyHighlights.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}</div>`
          : "",
        response.attributionOverview.length > 0
          ? `<div class="demo-results"><h3>Attribution Overview</h3>${response.attributionOverview.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}</div>`
          : "",
        response.sectionDiagnostics.length > 0
          ? `<div class="demo-results"><h3>Section Diagnostics</h3><div class="demo-result-grid">${response.sectionDiagnostics.map((diagnostic) => renderSectionDiagnosticCard(diagnostic)).join("")}</div></div>`
          : "",
        '<div class="demo-result-grid">',
        sectionGroups
          .map(
            (group) => `
              <article class="demo-result-item" id="${escapeHtml(group.targetId)}">
                <h3>${escapeHtml(group.label)}</h3>
                <p class="demo-result-source">${escapeHtml(group.summary)}</p>
                ${group.jumps.length > 0 ? `<div class="demo-badge-row">${group.jumps.map((jump) => `<a class="demo-state-chip" href="#${escapeHtml(jump.targetId)}">${escapeHtml(jump.label)}</a>`).join("")}</div>` : ""}
                <div class="demo-result-grid">
                  ${group.chunks
                    .map(
                      (result) => `
                    <article class="demo-result-item" id="${escapeHtml(result.targetId)}">
                      <h4>${escapeHtml(result.title ?? result.chunkId)}</h4>
                      <p class="demo-result-source">${escapeHtml(result.source ?? "unknown source")}</p>
                      <p class="demo-metadata">score ${formatScore(result.score)}</p>
                      ${[
                        result.labels?.contextLabel,
                        result.labels?.locatorLabel,
                        result.labels?.provenanceLabel,
                      ]
                        .filter(Boolean)
                        .map(
                          (line) =>
                            `<p class="demo-metadata">${escapeHtml(String(line))}</p>`,
                        )
                        .join("")}
                      ${formatDemoMetadataSummary(result.metadata)
                        .map(
                          (line) =>
                            `<p class="demo-metadata">${escapeHtml(line)}</p>`,
                        )
                        .join("")}
                      <p class="demo-result-text">${escapeHtml(result.text)}</p>
                    </article>`,
                    )
                    .join("")}
                </div>
              </article>`,
          )
          .join(""),
        "</div>",
        traceSummary,
        "</div>",
      ].join("");
    },
    documents: ({ documents }) => {
      if (documents.length === 0) {
        return '<ul class="demo-document-list"><li>No documents yet.</li></ul>';
      }

      return [
        '<ul class="demo-document-list">',
        documents
          .map((doc) => {
            const inspectUrl = `${ragPath}/documents/${encodeURIComponent(doc.id)}/chunks`;
            const deleteButton =
              doc.kind === "custom"
                ? `
                  <button
                    type="button"
                    hx-delete="${escapeHtml(`${ragPath}/documents/${encodeURIComponent(doc.id)}`)}"
                    hx-target="#mutation-status"
                    hx-swap="innerHTML"
                    hx-confirm="Delete ${escapeHtml(doc.title)}?"
                  >delete</button>`
                : "";

            const mode = escapeHtml(
              ragPath.split("/").pop() ?? "sqlite-native",
            );
            const searchBySourceVals = escapeHtml(
              JSON.stringify({
                query: `Source search for ${doc.source}`,
                source: doc.source,
                topK: 6,
              }),
            );
            const searchByDocumentVals = escapeHtml(
              JSON.stringify({
                query: `Explain ${doc.title}`,
                documentId: doc.id,
                topK: 6,
              }),
            );

            return `
              <li class="demo-document-row">
                <div>
                  <strong>${escapeHtml(doc.title)}</strong>
                  <p>${escapeHtml(doc.id)}</p>
                  <p>source: ${escapeHtml(doc.source)} · kind: ${escapeHtml(doc.kind ?? "unknown")}</p>
                  <p>${escapeHtml(doc.format ?? "text")} · ${escapeHtml(doc.chunkStrategy ?? "paragraphs")} · target size ${doc.chunkSize ?? 0}</p>
                  <p>chunks: ${doc.chunkCount ?? 0}</p>
                  ${formatDemoMetadataSummary(doc.metadata)
                    .map(
                      (line) =>
                        `<p class="demo-metadata">${escapeHtml(line)}</p>`,
                    )
                    .join("")}
                </div>
                <div class="demo-actions">
                  <button
                    type="button"
                    hx-get="${escapeHtml(inspectUrl)}"
                    hx-target="#chunk-preview-body"
                    hx-swap="innerHTML"
                  >Inspect chunks</button>
                  <button
                    type="button"
                    hx-post="/demo/message/${mode}/search"
                    hx-vals='${searchBySourceVals}'
                    hx-target="#search-results"
                    hx-swap="innerHTML"
                    hx-on::after-request="document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })"
                  >Search source</button>
                  <button
                    type="button"
                    hx-post="/demo/message/${mode}/search"
                    hx-vals='${searchByDocumentVals}'
                    hx-target="#search-results"
                    hx-swap="innerHTML"
                    hx-on::after-request="document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })"
                  >Search document</button>
                  ${deleteButton}
                </div>
              </li>`;
          })
          .join(""),
        "</ul>",
      ].join("");
    },
    chunkPreview: (preview) =>
      [
        '<div class="demo-results">',
        `<p class="demo-metadata">${escapeHtml(preview.document.title)} · ${escapeHtml(preview.document.format ?? "text")} · ${escapeHtml(preview.document.chunkStrategy ?? "paragraphs")} · ${preview.chunks.length} chunk(s)</p>`,
        '<article class="demo-result-item">',
        "<h3>Normalized text</h3>",
        `<p class="demo-result-text">${escapeHtml(preview.normalizedText)}</p>`,
        "</article>",
        '<div class="demo-result-grid">',
        preview.chunks
          .map(
            (chunk) => `
            <article class="demo-result-item">
              <h3>${escapeHtml(chunk.chunkId)}</h3>
              <p class="demo-result-source">source: ${escapeHtml(chunk.source ?? preview.document.source)}</p>
              <p class="demo-metadata">chunk index: ${String((chunk.metadata?.chunkIndex as number | undefined) ?? 0)} / count: ${String((chunk.metadata?.chunkCount as number | undefined) ?? preview.chunks.length)}</p>
              <p class="demo-result-text">${escapeHtml(chunk.text)}</p>
            </article>`,
          )
          .join(""),
        "</div>",
        "</div>",
      ].join(""),
    evaluateResult: ({ cases, summary }) =>
      [
        '<div class="demo-results">',
        "<h3>Benchmark Retrieval</h3>",
        '<p class="demo-metadata">This section runs the built-in benchmark suite through the server-side HTMX workflow so you can compare expected, retrieved, and missing evidence without client state.</p>',
        `<div class="demo-badge-row">${benchmarkOutcomeRail.map((entry) => `<span class="demo-state-chip" title="${escapeHtml(entry.summary)}">${escapeHtml(entry.label)}</span>`).join("")}</div>`,
        renderEvaluationResults(cases, summary),
        "</div>",
      ].join(""),
    mutationResult: (result) => {
      if (!result.ok) {
        return [
          `<div class="demo-results"><p class="demo-error">${escapeHtml(result.error ?? "Request failed")}</p><p class="demo-metadata">No demo surfaces were refreshed because the mutation failed.</p></div>`,
          renderMutationRefreshes(),
        ].join("");
      }

      const summary = result.deleted
        ? `Deleted ${result.deleted}`
        : result.inserted
          ? `Indexed ${result.inserted}`
          : result.status
            ? result.status
            : "Request complete";

      return [
        '<div class="demo-results">',
        `<p class="demo-banner">${escapeHtml(summary)}</p>`,
        '<ul class="demo-detail-list">',
        "<li>Diagnostics and indexed sources refresh automatically on this route.</li>",
        "<li>Knowledge base operations refresh automatically after mutations.</li>",
        "<li>Use the document row search actions to immediately verify source-scoped retrieval.</li>",
        "</ul>",
        "</div>",
        renderMutationRefreshes(),
      ].join("");
    },
    error: (message) => `<p class="demo-error">${escapeHtml(message)}</p>`,
  });
