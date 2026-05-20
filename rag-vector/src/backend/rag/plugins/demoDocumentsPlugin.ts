import { Elysia } from "elysia";
import type { DemoBackendMode } from "../../../frontend/demo-backends";
import {
  renderHtmxChunkPreviewFragment,
  renderHtmxDocumentsPanel,
} from "../handlers/htmxRagWorkflow";
import { resolveDemoBackend } from "../handlers/resolveDemoBackend";
import type {
  DemoInternalRequestHandler,
  RagBackends,
  RagStartupController,
} from "./pluginTypes";

const renderStandaloneDocumentsPage = ({
  mode,
  panelHtml,
}: {
  mode: DemoBackendMode;
  panelHtml: string;
}) => `<!doctype html>
<html lang="en">
  <head>
    <title>AbsoluteJS RAG Document Inspection - ${mode}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/assets/ico/favicon.ico" />
    <link rel="stylesheet" type="text/css" href="../../styles/indexes/rag-vector-demo.css" />
    <script src="/htmx/htmx.min.js"></script>
  </head>
  <body class="rag-demo-page">
    <main class="demo-layout">
      <section class="demo-card">
        <span class="demo-hero-kicker">HTMX document inspection</span>
        <h1>AbsoluteJS document inspection</h1>
        <div id="rag-readiness-badge" hx-get="/demo/rag-readiness/${mode}" hx-trigger="load" hx-swap="outerHTML">
          <p class="demo-metadata">Loading RAG readiness...</p>
        </div>
        <p>Inspect chunk boundaries, source-native evidence, and scoped retrieval actions from a standalone document surface.</p>
        <div class="demo-actions">
          <a class="demo-release-action demo-release-action-neutral" href="/htmx/${mode}#document-list">Open full HTMX demo</a>
        </div>
      </section>
      <div id="mutation-status" class="demo-results">
        <p class="demo-metadata">Document mutations and deletes will report here.</p>
      </div>
      <div id="search-results" class="demo-results">
        <p class="demo-metadata">Run a source or document search from a row action to inspect scoped retrieval.</p>
      </div>
      <section class="demo-card">
        <div id="document-list">${panelHtml}</div>
      </section>
    </main>
  </body>
</html>`;

export const createDemoDocumentsPlugin = ({
  handleInternalRequest,
  ragBackends,
  startup,
}: {
  handleInternalRequest: DemoInternalRequestHandler;
  ragBackends: RagBackends;
  startup: RagStartupController;
}) =>
  new Elysia()
    .get("/demo/documents/:mode", async ({ params, query, request }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      const ragStartup = startup.getSnapshot();
      if (ragStartup.status !== "ready") {
        const panelHtml = startup.renderPendingPanel(
          "documents-panel",
          "Documents Warming Up",
          startup.formatSummary(ragStartup),
        );
        if (request.headers.get("hx-request") === "true") {
          return panelHtml;
        }

        return renderStandaloneDocumentsPage({
          mode: resolved.mode,
          panelHtml,
        });
      }

      const documentsResponse = await handleInternalRequest(
        new Request(`http://absolute.local${resolved.backend.path}/documents`, {
          method: "GET",
        }),
      );

      if (!documentsResponse.ok) {
        return new Response(await documentsResponse.text(), {
          status: documentsResponse.status,
        });
      }

      const documentsPayload = (await documentsResponse.json()) as {
        documents?: Array<Record<string, unknown>>;
      };
      const documentQuery = typeof query.query === "string" ? query.query : "";
      const fileType =
        typeof query.fileType === "string" ? query.fileType : "all";
      const requestedPage =
        typeof query.page === "string" ? Number.parseInt(query.page, 10) : 1;
      const page =
        Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
      const activeDocumentId =
        typeof query.documentId === "string" ? query.documentId : undefined;
      const selectedChunkId =
        typeof query.chunkId === "string" ? query.chunkId : undefined;
      const shouldInspect =
        query.inspect === "true" && typeof activeDocumentId === "string";

      let activePreviewHtml: string | undefined;
      if (shouldInspect && activeDocumentId) {
        const previewResponse = await handleInternalRequest(
          new Request(
            `http://absolute.local${resolved.backend.path}/documents/${encodeURIComponent(activeDocumentId)}/chunks`,
            {
              method: "GET",
            },
          ),
        );

        if (previewResponse.ok) {
          activePreviewHtml = renderHtmxChunkPreviewFragment(
            await previewResponse.json(),
            {
              fileType,
              mode: resolved.mode,
              page,
              query: documentQuery,
              selectedChunkId,
            },
          );
        }
      }

      const panelHtml = renderHtmxDocumentsPanel({
        activeDocumentId: shouldInspect ? activeDocumentId : undefined,
        activePreviewHtml,
        documents: (documentsPayload.documents ?? []) as never,
        fileType,
        mode: resolved.mode,
        page,
        query: documentQuery,
      });

      if (request.headers.get("hx-request") === "true") {
        return panelHtml;
      }

      return renderStandaloneDocumentsPage({
        mode: resolved.mode,
        panelHtml,
      });
    })
    .get("/demo/documents/:mode/:id/chunks", async ({ params, query }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      const ragStartup = startup.getSnapshot();
      if (ragStartup.status !== "ready") {
        return startup.renderPendingPanel(
          "chunk-preview-body",
          "Chunk Preview Warming Up",
          startup.formatSummary(ragStartup),
        );
      }

      const previewResponse = await handleInternalRequest(
        new Request(
          `http://absolute.local${resolved.backend.path}/documents/${encodeURIComponent(params.id)}/chunks`,
          {
            method: "GET",
          },
        ),
      );

      if (!previewResponse.ok) {
        return new Response(await previewResponse.text(), {
          status: previewResponse.status,
        });
      }

      const documentQuery = typeof query.query === "string" ? query.query : "";
      const fileType =
        typeof query.fileType === "string" ? query.fileType : "all";
      const requestedPage =
        typeof query.page === "string" ? Number.parseInt(query.page, 10) : 1;
      const page =
        Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
      const selectedChunkId =
        typeof query.chunkId === "string" ? query.chunkId : undefined;

      return renderHtmxChunkPreviewFragment(await previewResponse.json(), {
        fileType,
        mode: resolved.mode,
        page,
        query: documentQuery,
        selectedChunkId,
      });
    });
