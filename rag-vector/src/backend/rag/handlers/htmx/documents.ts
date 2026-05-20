import { buildRAGChunkPreviewNavigation } from "@absolutejs/rag/client/ui";
import {
  buildActiveChunkPreviewSectionDiagnostic,
  formatChunkNavigationNodeLabel,
  formatChunkNavigationSectionLabel,
  formatChunkSectionGroupLabel,
  formatDemoMetadataSummary,
} from "../../../../frontend/demo-backends";
import { escapeHtml, renderSectionDiagnosticCard } from "./common";

type RAGIndexedDocument = {
  id: string;
  title: string;
  source: string;
  kind?: string;
  format?: string;
  chunkStrategy?: string;
  chunkSize?: number;
  chunkCount?: number;
  metadata?: Record<string, unknown>;
};

type RAGDocumentChunkPreview = {
  document: RAGIndexedDocument;
  normalizedText: string;
  chunks: Array<{
    chunkId: string;
    text: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }>;
};

const DOCUMENTS_PER_PAGE = 10;
const SUPPORTED_FILE_TYPE_OPTIONS = [
  ["all", "All file types"],
  [".md", "Markdown (.md)"],
  [".html", "HTML (.html)"],
  [".pdf", "PDF (.pdf)"],
  [".docx", "Word (.docx)"],
  [".csv", "CSV (.csv)"],
  [".ts", "TypeScript (.ts)"],
  [".tsx", "TSX (.tsx)"],
  [".js", "JavaScript (.js)"],
  [".json", "JSON (.json)"],
  [".txt", "Text (.txt)"],
] as const;

const inferDocumentExtension = (document: RAGIndexedDocument) => {
  const candidates = [document.source, document.title];
  for (const candidate of candidates) {
    const match = candidate.toLowerCase().match(/(\.[a-z0-9]+)(?:[#?].*)?$/);
    if (match) {
      return match[1];
    }
  }

  if (document.format === "markdown") {
    return ".md";
  }
  if (document.format === "html") {
    return ".html";
  }
  return ".txt";
};

const getChunkIndexText = (
  chunk: { metadata?: Record<string, unknown> },
  fallbackCount: number,
) => {
  const chunkIndex =
    typeof chunk.metadata?.chunkIndex === "number"
      ? chunk.metadata.chunkIndex
      : 0;
  const chunkCount =
    typeof chunk.metadata?.chunkCount === "number"
      ? chunk.metadata.chunkCount
      : fallbackCount;
  return `chunk index: ${String(chunkIndex)} / count: ${String(chunkCount)}`;
};

export const renderHtmxChunkPreviewFragment = (
  preview: RAGDocumentChunkPreview,
  options?: {
    mode?: string;
    query?: string;
    fileType?: string;
    page?: number;
    selectedChunkId?: string;
  },
) => {
  const navigation = buildRAGChunkPreviewNavigation(
    preview as Parameters<typeof buildRAGChunkPreviewNavigation>[0],
    options?.selectedChunkId,
  );
  const activeChunkId = navigation.activeChunkId;
  const query = options?.query ?? "";
  const fileType = options?.fileType ?? "all";
  const page = options?.page ?? 1;
  const previewUrlBase = options?.mode
    ? `/demo/documents/${encodeURIComponent(options.mode)}/${encodeURIComponent(preview.document.id)}/chunks?query=${encodeURIComponent(query)}&fileType=${encodeURIComponent(fileType)}&page=${page}`
    : undefined;

  const activeSectionDiagnostic = buildActiveChunkPreviewSectionDiagnostic(
    preview as never,
    activeChunkId ?? undefined,
  );

  return [
    '<p class="demo-section-caption">Chunk Preview</p>',
    `<p class="demo-metadata">${escapeHtml(preview.document.title)} · ${escapeHtml(preview.document.format ?? "text")} · ${escapeHtml(preview.document.chunkStrategy ?? "paragraphs")} · ${preview.chunks.length} chunk(s)</p>`,
    '<article class="demo-result-item">',
    "<h3>Normalized text</h3>",
    `<p class="demo-result-text">${escapeHtml(preview.normalizedText)}</p>`,
    "</article>",
    navigation.activeNode
      ? [
          '<div class="demo-chunk-nav">',
          '<div class="demo-chunk-nav-row">',
          `<p class="demo-metadata">Section · ${escapeHtml(formatChunkNavigationSectionLabel(navigation))}</p>`,
          '<div class="demo-actions">',
          navigation.previousNode && previewUrlBase
            ? `<button type="button" hx-get="${escapeHtml(`${previewUrlBase}&chunkId=${encodeURIComponent(navigation.previousNode.chunkId)}`)}" hx-target="#chunk-preview-${escapeHtml(preview.document.id)}" hx-swap="innerHTML">Previous chunk</button>`
            : '<button type="button" disabled>Previous chunk</button>',
          navigation.nextNode && previewUrlBase
            ? `<button type="button" hx-get="${escapeHtml(`${previewUrlBase}&chunkId=${encodeURIComponent(navigation.nextNode.chunkId)}`)}" hx-target="#chunk-preview-${escapeHtml(preview.document.id)}" hx-swap="innerHTML">Next chunk</button>`
            : '<button type="button" disabled>Next chunk</button>',
          "</div>",
          "</div>",
          navigation.sectionNodes.length > 0
            ? `<div class="demo-chunk-nav-strip">${navigation.sectionNodes
                .map((node) =>
                  previewUrlBase
                    ? `<button type="button" class="${node.chunkId === activeChunkId ? "demo-chunk-nav-chip demo-chunk-nav-chip-active" : "demo-chunk-nav-chip"}" hx-get="${escapeHtml(`${previewUrlBase}&chunkId=${encodeURIComponent(node.chunkId)}`)}" hx-target="#chunk-preview-${escapeHtml(preview.document.id)}" hx-swap="innerHTML">${escapeHtml(formatChunkNavigationNodeLabel(node))}</button>`
                    : `<span class="${node.chunkId === activeChunkId ? "demo-chunk-nav-chip demo-chunk-nav-chip-active" : "demo-chunk-nav-chip"}">${escapeHtml(formatChunkNavigationNodeLabel(node))}</span>`,
                )
                .join("")}</div>`
            : "",
          navigation.parentSection ||
          navigation.siblingSections.length > 0 ||
          navigation.childSections.length > 0
            ? `<div class="demo-chunk-nav-strip">${[
                navigation.parentSection &&
                previewUrlBase &&
                navigation.parentSection.leadChunkId
                  ? `<button type="button" class="demo-chunk-nav-chip" hx-get="${escapeHtml(`${previewUrlBase}&chunkId=${encodeURIComponent(navigation.parentSection.leadChunkId)}`)}" hx-target="#chunk-preview-${escapeHtml(preview.document.id)}" hx-swap="innerHTML">Parent · ${escapeHtml(formatChunkSectionGroupLabel(navigation.parentSection))}</button>`
                  : "",
                ...navigation.siblingSections.map((section) =>
                  previewUrlBase && section.leadChunkId
                    ? `<button type="button" class="demo-chunk-nav-chip" hx-get="${escapeHtml(`${previewUrlBase}&chunkId=${encodeURIComponent(section.leadChunkId)}`)}" hx-target="#chunk-preview-${escapeHtml(preview.document.id)}" hx-swap="innerHTML">Sibling · ${escapeHtml(formatChunkSectionGroupLabel(section))}</button>`
                    : "",
                ),
                ...navigation.childSections.map((section) =>
                  previewUrlBase && section.leadChunkId
                    ? `<button type="button" class="demo-chunk-nav-chip" hx-get="${escapeHtml(`${previewUrlBase}&chunkId=${encodeURIComponent(section.leadChunkId)}`)}" hx-target="#chunk-preview-${escapeHtml(preview.document.id)}" hx-swap="innerHTML">Child · ${escapeHtml(formatChunkSectionGroupLabel(section))}</button>`
                    : "",
                ),
              ].join("")}</div>`
            : "",
          "</div>",
        ].join("")
      : "",
    activeSectionDiagnostic
      ? renderSectionDiagnosticCard(activeSectionDiagnostic)
      : "",
    '<div class="demo-result-grid">',
    preview.chunks
      .map(
        (chunk) => `
        <article class="${chunk.chunkId === activeChunkId ? "demo-result-item demo-result-item-active" : "demo-result-item"}">
          <h3>${escapeHtml(chunk.chunkId)}</h3>
          <p class="demo-result-source">source: ${escapeHtml(chunk.source ?? preview.document.source)}</p>
          <p class="demo-metadata">${escapeHtml(getChunkIndexText(chunk, preview.chunks.length))}</p>
          <p class="demo-result-text">${escapeHtml(chunk.text)}</p>
        </article>`,
      )
      .join(""),
    "</div>",
  ].join("");
};

export const renderHtmxDocumentsPanel = ({
  documents,
  mode,
  query = "",
  fileType = "all",
  page = 1,
  activeDocumentId,
  activePreviewHtml,
}: {
  documents: RAGIndexedDocument[];
  mode: string;
  query?: string;
  fileType?: string;
  page?: number;
  activeDocumentId?: string;
  activePreviewHtml?: string;
}) => {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredDocuments = documents.filter((document) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      document.title.toLowerCase().includes(normalizedQuery) ||
      document.source.toLowerCase().includes(normalizedQuery) ||
      (document as { text?: string }).text
        ?.toLowerCase()
        .includes(normalizedQuery) === true;
    const matchesType =
      fileType === "all" || inferDocumentExtension(document) === fileType;
    return matchesQuery && matchesType;
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredDocuments.length / DOCUMENTS_PER_PAGE),
  );
  const activeDocumentPage = activeDocumentId
    ? Math.floor(
        Math.max(
          0,
          filteredDocuments.findIndex(
            (document) => document.id === activeDocumentId,
          ),
        ) / DOCUMENTS_PER_PAGE,
      ) + 1
    : undefined;
  const currentPage = Math.min(
    totalPages,
    Math.max(1, activeDocumentPage ?? page),
  );
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * DOCUMENTS_PER_PAGE,
    currentPage * DOCUMENTS_PER_PAGE,
  );

  const renderPageButton = (pageNumber: number) => `
    <button
      class="${pageNumber === currentPage ? "demo-page-button demo-page-button-active" : "demo-page-button"}"
      type="button"
      hx-get="/demo/documents/${escapeHtml(mode)}?query=${encodeURIComponent(query)}&fileType=${encodeURIComponent(fileType)}&page=${pageNumber}"
      hx-target="#document-list"
      hx-swap="innerHTML"
    >${pageNumber}</button>`;

  return [
    '<div class="demo-stat-grid">',
    `<article class="demo-stat-card"><span class="demo-stat-label">Indexed documents</span><strong>${filteredDocuments.length}</strong><p>${filteredDocuments.filter((document) => document.kind === "seed").length} seed · ${filteredDocuments.filter((document) => document.kind === "custom").length} custom</p></article>`,
    "</div>",
    '<div class="demo-source-filter-row">',
    `<input name="query" value="${escapeHtml(query)}" placeholder="Search indexed sources by title, source, or text" type="text" hx-get="/demo/documents/${escapeHtml(mode)}" hx-trigger="input changed delay:150ms" hx-target="#document-list" hx-swap="innerHTML" hx-include="#document-type-filter" />`,
    `<select id="document-type-filter" name="fileType" hx-get="/demo/documents/${escapeHtml(mode)}" hx-trigger="change" hx-target="#document-list" hx-swap="innerHTML" hx-include="previous input">`,
    SUPPORTED_FILE_TYPE_OPTIONS.map(
      ([value, label]) =>
        `<option value="${value}"${value === fileType ? " selected" : ""}>${label}</option>`,
    ).join(""),
    "</select>",
    "</div>",
    `<div class="demo-pagination-row"><p class="demo-metadata">Showing ${paginatedDocuments.length} of ${filteredDocuments.length} matching documents</p><div class="demo-pagination-controls">`,
    `<button type="button" ${currentPage <= 1 ? "disabled" : ""} hx-get="/demo/documents/${escapeHtml(mode)}?query=${encodeURIComponent(query)}&fileType=${encodeURIComponent(fileType)}&page=${Math.max(1, currentPage - 1)}" hx-target="#document-list" hx-swap="innerHTML">Prev</button>`,
    Array.from({ length: totalPages }, (_, index) =>
      renderPageButton(index + 1),
    ).join(""),
    `<button type="button" ${currentPage >= totalPages ? "disabled" : ""} hx-get="/demo/documents/${escapeHtml(mode)}?query=${encodeURIComponent(query)}&fileType=${encodeURIComponent(fileType)}&page=${Math.min(totalPages, currentPage + 1)}" hx-target="#document-list" hx-swap="innerHTML">Next</button>`,
    "</div></div>",
    paginatedDocuments.length === 0
      ? '<p class="demo-metadata">No indexed sources match the current filters.</p>'
      : `<div class="demo-document-list">${paginatedDocuments
          .map((doc) => {
            const inspectUrl = `/demo/documents/${mode}/${encodeURIComponent(doc.id)}/chunks`;
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
            const deleteButton =
              doc.kind === "custom"
                ? `<button type="button" hx-delete="/rag/${escapeHtml(mode)}/documents/${encodeURIComponent(doc.id)}" hx-target="#mutation-status" hx-swap="innerHTML" hx-confirm="Delete ${escapeHtml(doc.title)}?">Delete</button>`
                : "";

            return `
            <details class="demo-document-item demo-document-collapsible"${doc.id === activeDocumentId ? " open" : ""}>
              <summary>
                <div class="demo-document-header">
                  <div>
                    <h3>${escapeHtml(doc.title)}</h3>
                    <p class="demo-metadata">${escapeHtml(doc.source)} · ${escapeHtml(doc.kind ?? "unknown")} · ${doc.chunkCount ?? 0} chunk(s)</p>
                  </div>
                  <div class="demo-badge-row">
                    <span class="demo-badge">${escapeHtml(doc.format ?? "text")}</span>
                    <span class="demo-badge">${escapeHtml(doc.chunkStrategy ?? "paragraphs")}</span>
                    <span class="demo-badge">chunk target ${doc.chunkSize ?? 0} chars</span>
                  </div>
                </div>
              </summary>
              <div class="demo-collapsible-content">
                <div class="demo-actions">
                  <button type="button" hx-get="${escapeHtml(inspectUrl)}" hx-target="#chunk-preview-${escapeHtml(doc.id)}" hx-swap="innerHTML">Inspect chunks</button>
                  <button type="button" hx-post="/demo/message/${escapeHtml(mode)}/search" hx-vals='${searchBySourceVals}' hx-target="#search-results" hx-swap="innerHTML" hx-on::after-request="document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })">Search source</button>
                  <button type="button" hx-post="/demo/message/${escapeHtml(mode)}/search" hx-vals='${searchByDocumentVals}' hx-target="#search-results" hx-swap="innerHTML" hx-on::after-request="document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })">Search document</button>
                  ${deleteButton}
                </div>
                <div class="demo-key-value-grid">
                  <div class="demo-key-value-row"><span>Source</span><strong>${escapeHtml(doc.source)}</strong></div>
                  <div class="demo-key-value-row"><span>Kind</span><strong>${escapeHtml(doc.kind ?? "unknown")}</strong></div>
                  <div class="demo-key-value-row"><span>Chunks</span><strong>${doc.chunkCount ?? 0}</strong></div>
                  ${formatDemoMetadataSummary(doc.metadata)
                    .map(
                      (line) =>
                        `<div class="demo-key-value-row"><span>Metadata</span><strong>${escapeHtml(line)}</strong></div>`,
                    )
                    .join("")}
                </div>
                <div id="chunk-preview-${escapeHtml(doc.id)}" class="demo-inline-preview">${doc.id === activeDocumentId && activePreviewHtml ? activePreviewHtml : '<p class="demo-metadata">Pick Inspect chunks to compare normalized text with final chunk boundaries.</p>'}</div>
              </div>
            </details>`;
          })
          .join("")}</div>`,
  ].join("");
};
