import type {
  RAGAdminActionRecord,
  RAGAdminJobRecord,
  RAGCorpusHealth,
  RAGExtractorReadiness,
  RAGSyncSourceRecord,
} from "@absolutejs/rag";
import {
  buildInspectionEntries,
  formatFailureSummary,
  formatInspectionSamples,
  formatInspectionSummary,
  formatSyncSourceDetails,
  formatSyncSourceExtendedDetails,
  formatSyncSourceRecentRuns,
  formatSyncSourceSubtype,
  formatSyncSourceSummary,
  listLinkedConnectorAccounts,
} from "../../../../frontend/demo-backends";
import {
  escapeHtml,
  renderAdminActionCards,
  renderAdminJobCards,
  renderDetailList,
} from "./common";

type SyncBindingOption = {
  id: string;
  label?: string;
  email?: string;
  externalAccountId?: string;
};

type RAGDocumentSummary = {
  total: number;
  chunkCount: number;
  byKind: Record<string, number>;
};

type RAGMutationResponse = {
  ok: boolean;
  inserted?: string;
  deleted?: string;
  status?: string;
  error?: string;
};

type RAGOperationsResponse = {
  readiness?: RAGExtractorReadiness & {
    providerName?: string;
    model?: string;
    embeddingModel?: string;
  };
  health?: RAGCorpusHealth;
  status?: unknown;
  documents?: RAGDocumentSummary;
  adminJobs?: RAGAdminJobRecord[];
  adminActions?: RAGAdminActionRecord[];
  syncSources?: RAGSyncSourceRecord[];
};

const readSyncBindingOptions = (
  source: RAGSyncSourceRecord,
): SyncBindingOption[] => {
  const metadata =
    source.metadata && typeof source.metadata === "object"
      ? (source.metadata as Record<string, unknown>)
      : {};
  const raw = metadata.linkedAvailableBindings;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const id = typeof entry.id === "string" ? entry.id : "";
    if (!id) {
      return [];
    }

    return [
      {
        email: typeof entry.email === "string" ? entry.email : undefined,
        externalAccountId:
          typeof entry.externalAccountId === "string"
            ? entry.externalAccountId
            : undefined,
        id,
        label: typeof entry.label === "string" ? entry.label : undefined,
      },
    ];
  });
};

const readSelectedBindingId = (source: RAGSyncSourceRecord) => {
  const metadata =
    source.metadata && typeof source.metadata === "object"
      ? (source.metadata as Record<string, unknown>)
      : {};
  return typeof metadata.linkedBindingId === "string"
    ? metadata.linkedBindingId
    : undefined;
};

const renderSyncBindingSelector = (
  source: RAGSyncSourceRecord,
  mode?: string,
) => {
  const options = readSyncBindingOptions(source);
  if (options.length === 0) {
    return "";
  }

  const selectedBindingId = readSelectedBindingId(source);
  return [
    '<form class="demo-actions" hx-post="/demo/sync-selection/' +
      escapeHtml(mode ?? "sqlite-native") +
      "/" +
      encodeURIComponent(source.id) +
      '" hx-target="#ops-panel" hx-swap="outerHTML">',
    '<label class="demo-section-caption" for="binding-' +
      escapeHtml(source.id) +
      '">Linked binding</label>',
    '<select id="binding-' + escapeHtml(source.id) + '" name="bindingId">',
    '<option value="">Auto select first binding</option>',
    ...options.map((option) => {
      const optionLabel =
        option.label ?? option.email ?? option.externalAccountId ?? option.id;
      return (
        '<option value="' +
        escapeHtml(option.id) +
        '"' +
        (option.id === selectedBindingId ? " selected" : "") +
        ">" +
        escapeHtml(optionLabel) +
        "</option>"
      );
    }),
    "</select>",
    '<button type="submit">Use binding</button>',
    "</form>",
  ].join("");
};

export const renderHtmxOpsPanel = (
  ops: RAGOperationsResponse,
  mode?: string,
) => {
  const linkedConnectorAccounts = listLinkedConnectorAccounts(ops.syncSources);

  return [
    '<div id="ops-panel" class="demo-results">',
    "<h3>Knowledge Base Operations</h3>",
    '<div class="demo-stat-grid">',
    `<article class="demo-stat-card">
      <span class="demo-stat-label">Provider</span>
      <strong>${escapeHtml(ops.readiness?.providerConfigured ? (ops.readiness?.providerName ?? "Runtime provider routing") : "Not configured")}</strong>
      <p>${escapeHtml(
        ops.readiness?.providerConfigured
          ? ops.readiness?.model
            ? `Requests route through ${ops.readiness?.providerName ?? "the runtime provider registry"} with default model ${ops.readiness.model}.`
            : `Requests route through ${ops.readiness?.providerName ?? "the runtime provider registry"}.`
          : "Provider-backed retrieval is not configured yet.",
      )}</p>
    </article>`,
    `<article class="demo-stat-card">
      <span class="demo-stat-label">Embeddings</span>
      <strong>${escapeHtml(
        ops.readiness?.embeddingConfigured
          ? ops.readiness?.embeddingModel === "collection-managed embeddings"
            ? "Collection-managed"
            : "Configured"
          : "Missing",
      )}</strong>
      <p>${escapeHtml(
        ops.readiness?.embeddingConfigured
          ? ops.readiness?.embeddingModel === "collection-managed embeddings"
            ? "Embeddings come from the collection and vector store layer, so retrieval stays vector-backed without a separate top-level embedding provider."
            : (ops.readiness?.embeddingModel ?? "Embedding model configured.")
          : "Embeddings are not configured yet.",
      )}</p>
    </article>`,
    `<article class="demo-stat-card">
      <span class="demo-stat-label">Retrieval Stack</span>
      <strong>${escapeHtml(ops.readiness?.rerankerConfigured ? "Reranker ready" : "Vector only")}</strong>
      <p>${escapeHtml(ops.readiness?.indexManagerConfigured ? "Index manager configured." : "Index manager not configured.")}</p>
    </article>`,
    `<article class="demo-stat-card">
      <span class="demo-stat-label">Extractors</span>
      <strong>${escapeHtml(ops.readiness?.extractorsConfigured ? `${ops.readiness.extractorNames.length} configured` : "None configured")}</strong>
      <div class="demo-pill-row">${(ops.readiness?.extractorNames.length
        ? ops.readiness.extractorNames
        : ["No extractors configured"]
      )
        .map((name) => `<span class="demo-pill">${escapeHtml(name)}</span>`)
        .join("")}</div>
    </article>`,
    "</div>",
    '<div class="demo-ops-metric-grid">',
    `<article class="demo-result-item demo-score-card">
      <h4>Corpus coverage</h4>
      <p class="demo-score-headline">${escapeHtml(
        ops.health
          ? `Formats: ${
              Object.entries(ops.health.coverageByFormat)
                .map(([key, value]) => `${key} ${value}`)
                .join(" · ") || "none"
            }`
          : "Waiting for corpus health...",
      )}</p>
      <div class="demo-key-value-list">
        <div class="demo-key-value-row"><span>By kind</span><strong>${escapeHtml(
          ops.health
            ? Object.entries(ops.health.coverageByKind)
                .map(([key, value]) => `${key} ${value}`)
                .join(" · ") || "none"
            : "n/a",
        )}</strong></div>
        <div class="demo-key-value-row"><span>Average chunks per document</span><strong>${escapeHtml(
          ops.health ? ops.health.averageChunksPerDocument.toFixed(2) : "n/a",
        )}</strong></div>
      </div>
    </article>`,
    `<article class="demo-result-item demo-score-card">
      <h4>Chunk quality</h4>
      <p class="demo-score-headline">${escapeHtml(
        ops.health
          ? `Empty docs ${ops.health.emptyDocuments} · Empty chunks ${ops.health.emptyChunks} · Low signal ${ops.health.lowSignalChunks}`
          : "Waiting for corpus health...",
      )}</p>
      <div class="demo-key-value-list">
        <div class="demo-key-value-row"><span>Missing source</span><strong>${escapeHtml(String(ops.health?.documentsMissingSource ?? "n/a"))}</strong></div>
        <div class="demo-key-value-row"><span>Missing title</span><strong>${escapeHtml(String(ops.health?.documentsMissingTitle ?? "n/a"))}</strong></div>
        <div class="demo-key-value-row"><span>Missing metadata</span><strong>${escapeHtml(String(ops.health?.documentsMissingMetadata ?? "n/a"))}</strong></div>
      </div>
    </article>`,
    `<article class="demo-result-item demo-score-card">
      <h4>Freshness</h4>
      <p class="demo-score-headline">${escapeHtml(
        ops.health
          ? `Stale documents ${ops.health.staleDocuments.length} within ${((ops.health.staleAfterMs ?? 0) / 86400000).toFixed(1)}d threshold`
          : "Waiting for corpus health...",
      )}</p>
      <div class="demo-key-value-list">
        <div class="demo-key-value-row"><span>Oldest age</span><strong>${escapeHtml(
          ops.health?.oldestDocumentAgeMs
            ? `${(ops.health.oldestDocumentAgeMs / 3600000).toFixed(1)}h`
            : "n/a",
        )}</strong></div>
        <div class="demo-key-value-row"><span>Newest age</span><strong>${escapeHtml(
          ops.health?.newestDocumentAgeMs
            ? `${(ops.health.newestDocumentAgeMs / 1000).toFixed(1)}s`
            : "n/a",
        )}</strong></div>
      </div>
    </article>`,
    `<article class="demo-result-item demo-score-card">
      <h4>Failures</h4>
      <p class="demo-score-headline">${escapeHtml(
        ops.health
          ? `Failed ingest jobs ${ops.health.failedIngestJobs} · Failed admin jobs ${ops.health.failedAdminJobs}`
          : "Waiting for corpus health...",
      )}</p>
      ${renderDetailList([...formatFailureSummary(ops.health), ...formatInspectionSummary(ops.health), ...formatInspectionSamples(ops.health)], "No recorded failures.")}
      ${
        buildInspectionEntries(ops.health).length > 0
          ? `<div class="demo-actions">${buildInspectionEntries(ops.health)
              .map((entry) => {
                const targetMode = escapeHtml(mode ?? "sqlite-native");
                const query = entry.sourceQuery
                  ? `query=${encodeURIComponent(entry.sourceQuery)}`
                  : "";
                const documentId = entry.documentId
                  ? `documentId=${encodeURIComponent(entry.documentId)}`
                  : "";
                const inspect = entry.documentId ? "inspect=true" : "";
                const href = `/demo/documents/${targetMode}${query || documentId || inspect ? `?${[query, documentId, inspect].filter(Boolean).join("&")}` : ""}`;
                return `<a class="demo-release-action demo-release-action-neutral" href="${href}">${escapeHtml(entry.documentId ? `Inspect ${entry.kind}` : "Open documents")} · ${escapeHtml(entry.label)}</a>`;
              })
              .join("")}</div>`
          : ""
      }
    </article>`,
    "</div>",
    linkedConnectorAccounts.length > 0
      ? [
          '<div class="demo-result-grid">',
          '<article class="demo-result-item"><h4>Linked Connectors For This Account</h4>',
          '<p class="demo-metadata">These bindings are resolved from the signed-in AbsoluteJS account. Gmail and Google Contacts sync will read from the bindings shown here.</p>',
          '<div class="demo-stat-grid">',
          ...linkedConnectorAccounts.map((account) =>
            [
              '<article class="demo-stat-card">',
              `<span class="demo-stat-label">${escapeHtml(account.providerLabel)}</span>`,
              `<strong>${escapeHtml(account.accountLabel ?? account.email ?? "No linked account resolved")}</strong>`,
              `<p>${escapeHtml(
                account.providerFound
                  ? `Using ${account.bindingLabel ?? account.bindingId ?? "the resolved binding"} for ${account.sourceLabel}.`
                  : (account.providerError ??
                      `No ${account.providerLabel} binding is resolved for ${account.sourceLabel}.`),
              )}</p>`,
              '<div class="demo-key-value-list">',
              `<div class="demo-key-value-row"><span>Source</span><strong>${escapeHtml(account.sourceLabel)}</strong></div>`,
              `<div class="demo-key-value-row"><span>Binding</span><strong>${escapeHtml(account.bindingLabel ?? account.bindingId ?? "auto-select first binding")}</strong></div>`,
              `<div class="demo-key-value-row"><span>Binding status</span><strong>${escapeHtml(account.bindingStatus ?? "missing")}</strong></div>`,
              `<div class="demo-key-value-row"><span>Grant status</span><strong>${escapeHtml(account.grantStatus ?? "missing")}</strong></div>`,
              `<div class="demo-key-value-row"><span>Selection mode</span><strong>${escapeHtml(account.selectionMode ?? "unconfigured")}</strong></div>`,
              `<div class="demo-key-value-row"><span>Available bindings</span><strong>${escapeHtml(typeof account.availableBindingCount === "number" ? String(account.availableBindingCount) : "0")}</strong></div>`,
              account.scopeSummary
                ? `<div class="demo-key-value-row"><span>Scopes</span><strong>${escapeHtml(account.scopeSummary)}</strong></div>`
                : "",
              "</div>",
              "</article>",
            ].join(""),
          ),
          "</div></article>",
          "</div>",
        ].join("")
      : "",
    '<div class="demo-result-grid">',
    '<article class="demo-result-item"><h4>Sync Sources</h4>' +
      ((ops.syncSources?.length ?? 0) > 0
        ? [
            `<div class="demo-actions"><button type="button" hx-post="/demo/sync/${escapeHtml(mode ?? "sqlite-native")}" hx-vals='{"background":"true"}' hx-target="#ops-panel" hx-swap="outerHTML">Start source sync</button><button type="button" hx-post="/demo/sync/${escapeHtml(mode ?? "sqlite-native")}" hx-vals='{"background":"true"}' hx-target="#ops-panel" hx-swap="outerHTML">Queue background sync</button></div>`,
            '<div class="demo-stat-grid">',
            ...(ops.syncSources ?? []).map((source) =>
              [
                '<details class="demo-stat-card demo-sync-action-group">',
                `<summary><strong>${escapeHtml(source.label)}</strong><span class="demo-sync-action-meta">${escapeHtml(formatSyncSourceSummary(source))}</span></summary>`,
                `<p class="demo-metadata">${escapeHtml(formatSyncSourceSubtype(source))}</p>`,
                '<div class="demo-pill-row">',
                `<span class="demo-pill">${escapeHtml(source.kind)}</span>`,
                `<span class="demo-pill">${escapeHtml(source.status.toLowerCase())}</span>`,
                `${typeof source.documentCount === "number" ? `<span class="demo-pill">${escapeHtml(`${source.documentCount} docs`)}</span>` : ""}`,
                `${typeof source.chunkCount === "number" ? `<span class="demo-pill">${escapeHtml(`${source.chunkCount} chunks`)}</span>` : ""}`,
                "</div>",
                '<div class="demo-actions">',
                `${renderSyncBindingSelector(source, mode)}`,
                `<button type="button" hx-post="/demo/sync/${escapeHtml(mode ?? "sqlite-native")}/${encodeURIComponent(source.id)}" hx-vals='{"background":"true"}' hx-target="#ops-panel" hx-swap="outerHTML">Start sync</button>`,
                `<button type="button" hx-post="/demo/sync/${escapeHtml(mode ?? "sqlite-native")}/${encodeURIComponent(source.id)}" hx-vals='{"background":"true"}' hx-target="#ops-panel" hx-swap="outerHTML">Queue in background</button>`,
                "</div>",
                `<div class="demo-key-value-list">${formatSyncSourceDetails(
                  source,
                )
                  .slice(0, 4)
                  .map((line) => {
                    const separator = line.indexOf(":");
                    if (separator < 0) {
                      return `<div class="demo-key-value-row"><span>detail</span><strong>${escapeHtml(line)}</strong></div>`;
                    }

                    return `<div class="demo-key-value-row"><span>${escapeHtml(line.slice(0, separator))}</span><strong>${escapeHtml(line.slice(separator + 1).trim())}</strong></div>`;
                  })
                  .join("")}</div>`,
                (() => {
                  const recentRuns = formatSyncSourceRecentRuns(source);
                  const extraDetails = [
                    ...formatSyncSourceDetails(source).slice(4),
                    ...formatSyncSourceExtendedDetails(source),
                  ];

                  return [
                    recentRuns.length > 0
                      ? `<div class="demo-key-value-list">${recentRuns
                          .map(
                            (run) => `
                            <div class="demo-key-value-row">
                              <span>${escapeHtml(run.label)}</span>
                              <strong>${escapeHtml(`${run.trigger} · ${run.status} · ${run.output} · ${run.duration} · ${run.finishedAt}`)}</strong>
                            </div>`,
                          )
                          .join("")}</div>`
                      : "",
                    extraDetails.length > 0
                      ? `<details class="demo-collapsible"><summary>More sync details</summary>${renderDetailList(extraDetails, "No additional sync details.")}</details>`
                      : "",
                  ].join("");
                })(),
                "</details>",
              ].join(""),
            ),
            "</div>",
          ].join("")
        : renderDetailList([], "No sync sources configured yet.")) +
      "</article>",
    '<article class="demo-result-item"><h4>Admin Jobs</h4>' +
      renderAdminJobCards(ops.adminJobs) +
      "</article>",
    '<article class="demo-result-item"><h4>Recent Admin Actions</h4>' +
      renderAdminActionCards(ops.adminActions) +
      "</article>",
    "</div>",
    "</div>",
  ].join("");
};
