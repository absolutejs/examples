import {
  formatEvaluationHistoryRows,
  formatEvaluationHistorySummary,
  formatEvaluationHistoryTracePresentations,
  formatGroundingCaseDifficultyEntry,
  formatGroundingDifficultyHistoryDetails,
  formatGroundingDifficultyHistorySummary,
  formatGroundingEvaluationCase,
  formatGroundingEvaluationDetails,
  formatGroundingEvaluationSummary,
  formatGroundingHistoryDetails,
  formatGroundingHistorySnapshotPresentations,
  formatGroundingHistorySummary,
  formatGroundingProviderCasePresentations,
  formatGroundingProviderOverviewPresentation,
  formatGroundingProviderPresentations,
  formatQualityOverviewNotes,
  formatQualityOverviewPresentation,
  formatRerankerComparisonOverviewPresentation,
  formatRerankerComparisonPresentations,
  formatRetrievalComparisonOverviewPresentation,
  formatRetrievalComparisonPresentations,
  type DemoRetrievalQualityResponse,
} from "../../../../frontend/demo-backends";
import { escapeHtml } from "./common";

export const renderHtmxQualityPanel = ({
  groundingEvaluation,
  providerGroundingComparison,
  providerGroundingDifficultyHistory,
  providerGroundingHistories,
  retrievalComparison,
  rerankerComparison,
  retrievalHistories,
  rerankerHistories,
  suite,
}: DemoRetrievalQualityResponse) =>
  [
    (() => {
      const overview = formatQualityOverviewPresentation({
        retrievalComparison,
        rerankerComparison,
        groundingEvaluation,
        groundingProviderOverview: providerGroundingComparison
          ? formatGroundingProviderOverviewPresentation(
              providerGroundingComparison,
            )
          : undefined,
      });
      return [
        `<div class="demo-results demo-quality-card">`,
        `<h3>Retrieval Quality Tooling</h3>`,
        `<p class="demo-metadata">This server-rendered HTMX version keeps the same summary-first hierarchy as the framework pages: winners up top, strategy cards next, grounding drill-downs after that, and history behind collapsible sections.</p>`,
        `<div class="demo-pill-row"><span class="demo-pill">${escapeHtml(suite.label ?? suite.id)} · ${suite.input.cases.length} cases</span></div>`,
        `<div class="demo-stat-grid">`,
        `<article class="demo-stat-card"><span class="demo-stat-label">Retrieval winner</span><strong>${escapeHtml(formatRetrievalComparisonOverviewPresentation(retrievalComparison).winnerLabel)}</strong><p>${escapeHtml(formatRetrievalComparisonOverviewPresentation(retrievalComparison).summary)}</p></article>`,
        `<article class="demo-stat-card"><span class="demo-stat-label">Reranker winner</span><strong>${escapeHtml(formatRerankerComparisonOverviewPresentation(rerankerComparison).winnerLabel)}</strong><p>${escapeHtml(formatRerankerComparisonOverviewPresentation(rerankerComparison).summary)}</p></article>`,
        `<article class="demo-stat-card"><span class="demo-stat-label">Grounding winner</span><strong>${escapeHtml(providerGroundingComparison ? formatGroundingProviderOverviewPresentation(providerGroundingComparison).winnerLabel : "Stored workflow evaluation")}</strong><p>${escapeHtml(providerGroundingComparison ? formatGroundingProviderOverviewPresentation(providerGroundingComparison).summary : formatGroundingEvaluationSummary(groundingEvaluation))}</p></article>`,
        `<article class="demo-stat-card"><span class="demo-stat-label">Why this matters</span><strong>Summary first</strong><p>Detailed evidence stays collapsed until you need to inspect regressions or grounding drift.</p></article>`,
        `</div>`,
        `<div class="demo-result-grid">`,
        `<article class="demo-result-item"><h4>Winners at a glance</h4><div class="demo-key-value-grid">${overview.rows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></article>`,
        `<article class="demo-result-item"><h4>Why this matters</h4><div class="demo-insight-stack">${formatQualityOverviewNotes()
          .map(
            (insight) =>
              `<p class="demo-insight-card">${escapeHtml(insight)}</p>`,
          )
          .join("")}</div></article>`,
        `</div>`,
        `<div class="demo-result-grid">${formatRetrievalComparisonPresentations(
          retrievalComparison,
        )
          .map(
            (card) =>
              `<article class="demo-result-item demo-score-card"><h4>${escapeHtml(card.label)}</h4><p class="demo-score-headline">${escapeHtml(card.summary)}</p><div class="demo-key-value-grid demo-trace-summary-grid">${card.traceSummaryRows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div><details class="demo-collapsible demo-trace-diff"><summary><span>Trace diff vs leader</span><strong>${escapeHtml(card.diffLabel)}</strong></summary><div class="demo-collapsible-content demo-trace-diff-grid">${card.diffRows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></details></article>`,
          )
          .join("")}${formatRerankerComparisonPresentations(rerankerComparison)
          .map(
            (card) =>
              `<article class="demo-result-item demo-score-card"><h4>${escapeHtml(card.label)}</h4><p class="demo-score-headline">${escapeHtml(card.summary)}</p><div class="demo-key-value-grid demo-trace-summary-grid">${card.traceSummaryRows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div><details class="demo-collapsible demo-trace-diff"><summary><span>Trace diff vs leader</span><strong>${escapeHtml(card.diffLabel)}</strong></summary><div class="demo-collapsible-content demo-trace-diff-grid">${card.diffRows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></details></article>`,
          )
          .join("")}</div>`,
        `<div class="demo-result-grid">${groundingEvaluation.cases
          .map(
            (entry) =>
              `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(entry.label ?? entry.caseId)}</span><strong>${escapeHtml(formatGroundingEvaluationCase(entry))}</strong></summary><div class="demo-collapsible-content">${formatGroundingEvaluationDetails(
                entry,
              )
                .map(
                  (line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`,
                )
                .join("")}</div></details>`,
          )
          .join("")}</div>`,
        `${
          providerGroundingComparison
            ? `<div class="demo-result-grid">${formatGroundingProviderPresentations(
                providerGroundingComparison.entries,
              )
                .map(
                  (card: { label: string; summary: string }) =>
                    `<article class="demo-result-item demo-score-card"><h4>${escapeHtml(card.label)}</h4><p class="demo-score-headline">${escapeHtml(card.summary)}</p></article>`,
                )
                .join(
                  "",
                )}<article class="demo-result-item"><h4>Hardest cases</h4><div class="demo-pill-row">${providerGroundingComparison.difficultyLeaderboard.map((entry) => `<span class="demo-pill">${escapeHtml(formatGroundingCaseDifficultyEntry(entry))}</span>`).join("")}</div></article></div>`
            : ""
        }`,
        `${
          providerGroundingComparison
            ? `<div class="demo-result-grid">${formatGroundingProviderCasePresentations(
                providerGroundingComparison.caseComparisons,
              )
                .map(
                  (card: {
                    label: string;
                    summary: string;
                    rows: Array<{ label: string; value: string }>;
                  }) =>
                    `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.summary)}</strong></summary><div class="demo-collapsible-content">${card.rows.map((row: { label: string; value: string }) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></details>`,
                )
                .join("")}</div>`
            : ""
        }`,
        `<div class="demo-result-grid">${retrievalComparison.entries
          .map(
            (entry) =>
              `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(entry.label)} history</span><strong>${escapeHtml(formatEvaluationHistorySummary(retrievalHistories[entry.retrievalId])[0] ?? "No runs yet")}</strong></summary><div class="demo-collapsible-content">${formatEvaluationHistoryRows(
                retrievalHistories[entry.retrievalId],
              )
                .map(
                  (row) =>
                    `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`,
                )
                .join(
                  "",
                )}<div class="demo-result-grid">${formatEvaluationHistoryTracePresentations(
                retrievalHistories[entry.retrievalId],
              )
                .map(
                  (traceCase) =>
                    `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(traceCase.label)}</span><strong>${escapeHtml(traceCase.summary)}</strong></summary><div class="demo-collapsible-content">${traceCase.rows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></details>`,
                )
                .join("")}</div></div></details>`,
          )
          .join("")}${rerankerComparison.entries
          .map(
            (entry) =>
              `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(entry.label)} history</span><strong>${escapeHtml(formatEvaluationHistorySummary(rerankerHistories[entry.rerankerId])[0] ?? "No runs yet")}</strong></summary><div class="demo-collapsible-content">${formatEvaluationHistoryRows(
                rerankerHistories[entry.rerankerId],
              )
                .map(
                  (row) =>
                    `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`,
                )
                .join(
                  "",
                )}<div class="demo-result-grid">${formatEvaluationHistoryTracePresentations(
                rerankerHistories[entry.rerankerId],
              )
                .map(
                  (traceCase) =>
                    `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(traceCase.label)}</span><strong>${escapeHtml(traceCase.summary)}</strong></summary><div class="demo-collapsible-content">${traceCase.rows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></details>`,
                )
                .join("")}</div></div></details>`,
          )
          .join("")}</div>`,
        `${
          providerGroundingComparison
            ? `<div class="demo-result-grid">${providerGroundingComparison.entries
                .map((entry) => {
                  const history = providerGroundingHistories[entry.providerKey];
                  return `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(entry.label)} history</span><strong>${escapeHtml(formatGroundingHistorySummary(history)[0] ?? "No runs yet")}</strong></summary><div class="demo-collapsible-content">${formatGroundingHistoryDetails(
                    history,
                  )
                    .map(
                      (line) =>
                        `<p class="demo-metadata">${escapeHtml(line)}</p>`,
                    )
                    .join("")}${
                    formatGroundingHistorySnapshotPresentations(history).length
                      ? `<div class="demo-result-grid">${formatGroundingHistorySnapshotPresentations(
                          history,
                        )
                          .map(
                            (snapshot) =>
                              `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(snapshot.label)}</span><strong>${escapeHtml(snapshot.summary)}</strong></summary><div class="demo-collapsible-content">${snapshot.rows.map((row) => `<p class="demo-key-value-row"><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span></p>`).join("")}</div></details>`,
                          )
                          .join("")}</div>`
                      : ""
                  }</div></details>`;
                })
                .join(
                  "",
                )}<details class="demo-result-item demo-collapsible"><summary><span>Grounding difficulty history</span><strong>${escapeHtml(formatGroundingDifficultyHistorySummary(providerGroundingDifficultyHistory)[0] ?? "No history yet")}</strong></summary><div class="demo-collapsible-content">${formatGroundingDifficultyHistoryDetails(
                providerGroundingDifficultyHistory,
              )
                .map(
                  (line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`,
                )
                .join("")}</div></details></div>`
            : ""
        }`,
        `</div>`,
      ].join("");
    })(),
  ].join("");
