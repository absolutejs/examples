import { file } from "bun";
import { networking } from "@absolutejs/absolute";
import { Elysia } from "elysia";
import { join } from "node:path";
import {
  buildDemoUploadIngestInput,
  getDemoUploadPreset,
} from "../../frontend/demo-backends";
import { buildRagAbsoluteAuth } from "../shared/auth/config";
import { getRagServicePort } from "../shared/ragServiceConfig";
import { renderHtmxOpsPanel } from "./handlers/htmxRagWorkflow";
import { createRagRuntime } from "./handlers/ragRuntime";
import { resolveDemoBackend } from "./handlers/resolveDemoBackend";
import { createDemoDocumentsPlugin } from "./plugins/demoDocumentsPlugin";
import { createDemoFixturesPlugin } from "./plugins/demoFixturesPlugin";
import { createDemoMessagingPlugin } from "./plugins/demoMessagingPlugin";
import type { DemoInternalRequestHandler } from "./plugins/pluginTypes";
import { createDemoQualityPlugin } from "./plugins/demoQualityPlugin";
import { createDemoReadinessPlugin } from "./plugins/demoReadinessPlugin";
import { createDemoReleasePlugin } from "./plugins/demoReleasePlugin";
import { createDemoUiStatePlugin } from "./plugins/demoUiStatePlugin";
import { createRagBackendPlugin } from "./plugins/ragBackendPlugin";

const runtime = createRagRuntime();
let handleInternalRequest: DemoInternalRequestHandler = async () =>
  new Response("RAG service is not ready yet.", { status: 503 });
const dispatchInternalRequest: DemoInternalRequestHandler = (request) =>
  handleInternalRequest(request);

const service = new Elysia()
  .use(
    await buildRagAbsoluteAuth({
      authDatabaseUrl: runtime.authDatabaseUrl,
      authSessionStore: runtime.authSessionStore,
    }),
  )
  .onRequest(() => {
    runtime.startup.schedule();
  })
  .get("/", () => ({
    service: "rag",
    status: runtime.startup.getSnapshot().status,
    visibility: "internal",
  }))
  .get("/health", () => ({ healthy: true }))
  .use(
    createRagBackendPlugin({
      createDemoCollection: runtime.createDemoCollection,
      demoAIProvider: runtime.demoAIProvider,
      demoQueryTransform: runtime.demoQueryTransform,
      indexManager: runtime.indexManager,
      ragBackends: runtime.ragBackends,
      ragDemoState: runtime.ragDemoState,
      releaseDemo: runtime.releaseDemo,
    }),
  )
  .use(createDemoFixturesPlugin())
  .use(
    createDemoUiStatePlugin({
      demoAIProvider: runtime.demoAIProvider,
      uiState: runtime.uiState,
    }),
  )
  .use(
    createDemoMessagingPlugin({
      demoAIProvider: runtime.demoAIProvider,
      handleInternalRequest: dispatchInternalRequest,
      ragBackends: runtime.ragBackends,
      startup: runtime.startup,
    }),
  )
  .use(
    createDemoQualityPlugin({
      handleInternalRequest: dispatchInternalRequest,
      quality: runtime.quality,
      ragBackends: runtime.ragBackends,
      startup: runtime.startup,
    }),
  )
  .use(
    createDemoReleasePlugin({
      handleInternalRequest: dispatchInternalRequest,
      ragBackends: runtime.ragBackends,
      releaseDemo: runtime.releaseDemo,
    }),
  )
  .use(
    createDemoReadinessPlugin({
      ragBackends: runtime.ragBackends,
      startup: runtime.startup,
    }),
  )
  .use(
    createDemoDocumentsPlugin({
      handleInternalRequest: dispatchInternalRequest,
      ragBackends: runtime.ragBackends,
      startup: runtime.startup,
    }),
  )
  .post("/demo/upload/:mode/:id", async ({ params }) => {
    const resolved = resolveDemoBackend(runtime.ragBackends, params.mode);
    if ("error" in resolved) {
      return resolved.error;
    }

    const ragStartup = runtime.startup.getSnapshot();
    if (ragStartup.status !== "ready") {
      return runtime.startup.renderPendingPanel(
        "upload-status",
        "Upload Warming Up",
        runtime.startup.formatSummary(ragStartup),
      );
    }

    const preset = getDemoUploadPreset(params.id);
    if (!preset) {
      return new Response(`Unknown upload fixture ${params.id}`, {
        status: 404,
      });
    }

    const bytes = await file(
      join(process.cwd(), "rag-demo-corpus", preset.fixturePath),
    ).arrayBuffer();
    const base64Content = Buffer.from(new Uint8Array(bytes)).toString("base64");
    const response = await dispatchInternalRequest(
      new Request(`http://absolute.local${resolved.backend.path}/ingest`, {
        body: JSON.stringify(buildDemoUploadIngestInput(preset, base64Content)),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );

    if (!response.ok) {
      return new Response(await response.text(), { status: response.status });
    }

    return [
      '<div id="upload-status" class="demo-results">',
      '<p class="demo-banner">Uploaded fixture through the extractor-backed ingest route.</p>',
      `<p class="demo-metadata"><strong>${preset.label}</strong> is now queryable through ${resolved.backend.path}.</p>`,
      `<p class="demo-metadata">Verification query: ${preset.query}</p>`,
      `<p class="demo-metadata">Expected uploaded source: ${preset.expectedSources.join(", ")}</p>`,
      "</div>",
    ].join("");
  })
  .get("/demo/sync-sources/:mode", (context) =>
    context.protectRoute(async (user) => {
      const resolved = resolveDemoBackend(
        runtime.ragBackends,
        context.params.mode,
      );
      if ("error" in resolved) {
        return resolved.error;
      }

      const startup = runtime.startup.getSnapshot();
      return {
        mode: resolved.mode,
        startup: {
          elapsedMs: startup.elapsedMs,
          status: startup.status,
          summary: runtime.startup.formatSummary(startup),
        },
        syncSources: await runtime.indexManager.listSyncSources({
          userSub: user.sub,
        }),
      };
    }),
  )
  .get("/demo/ops/:mode", (context) =>
    context.protectRoute(async (user) => {
      const resolved = resolveDemoBackend(
        runtime.ragBackends,
        context.params.mode,
      );
      if ("error" in resolved) {
        return resolved.error;
      }

      const ragStartup = runtime.startup.getSnapshot();
      if (ragStartup.status !== "ready") {
        return runtime.startup.renderWarmupPanel(resolved.mode);
      }

      const response = await dispatchInternalRequest(
        new Request(`http://absolute.local${resolved.backend.path}/ops`, {
          headers: {
            "x-absolutejs-user-sub": user.sub,
          },
          method: "GET",
        }),
      );

      if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
      }

      return renderHtmxOpsPanel(await response.json(), resolved.mode);
    }),
  )
  .post("/demo/sync/:mode", (context) =>
    context.protectRoute(async (user) => {
      const resolved = resolveDemoBackend(
        runtime.ragBackends,
        context.params.mode,
      );
      if ("error" in resolved) {
        return resolved.error;
      }

      const ragStartup = runtime.startup.getSnapshot();
      if (ragStartup.status !== "ready") {
        return runtime.startup.renderMutationBlockedResponse(
          resolved.mode,
          runtime.startup.formatSummary(ragStartup),
        );
      }

      const form = await context.request.formData().catch(() => null);
      const background =
        typeof form?.get("background") === "string" &&
        form.get("background") === "true";
      const syncResponse = await dispatchInternalRequest(
        new Request(`http://absolute.local${resolved.backend.path}/sync`, {
          body: background ? JSON.stringify({ background: true }) : undefined,
          headers: background
            ? {
                "Content-Type": "application/json",
                "x-absolutejs-user-sub": user.sub,
              }
            : {
                "x-absolutejs-user-sub": user.sub,
              },
          method: "POST",
        }),
      );

      if (!syncResponse.ok) {
        return new Response(await syncResponse.text(), {
          status: syncResponse.status,
        });
      }

      const opsResponse = await dispatchInternalRequest(
        new Request(`http://absolute.local${resolved.backend.path}/ops`, {
          headers: {
            "x-absolutejs-user-sub": user.sub,
          },
          method: "GET",
        }),
      );

      if (!opsResponse.ok) {
        return new Response(await opsResponse.text(), {
          status: opsResponse.status,
        });
      }

      const summary = background
        ? "Queued background sync for all sources."
        : "Synced all configured sources.";
      return [
        '<div id="mutation-status" hx-swap-oob="innerHTML">',
        '<div class="demo-results">',
        `<p class="demo-banner">${summary}</p>`,
        '<ul class="demo-detail-list">',
        "<li>Knowledge base operations refreshed with the latest sync state.</li>",
        "<li>Diagnostics and indexed sources continue to refresh automatically on this route.</li>",
        "</ul>",
        "</div>",
        "</div>",
        '<div id="htmx-ops" hx-swap-oob="innerHTML">',
        renderHtmxOpsPanel(await opsResponse.json(), resolved.mode),
        "</div>",
      ].join("");
    }),
  )
  .post("/demo/sync-selection/:mode/:id", (context) =>
    context.protectRoute(async (user) => {
      const resolved = resolveDemoBackend(
        runtime.ragBackends,
        context.params.mode,
      );
      if ("error" in resolved) {
        return resolved.error;
      }

      const requestText = await context.request
        .clone()
        .text()
        .catch(() => "");
      const form = await context.request.formData().catch(() => null);
      const textBindingId = new URLSearchParams(requestText).get("bindingId");
      const formBindingId = form?.get("bindingId");
      const bindingIdValue =
        typeof textBindingId === "string" && textBindingId.trim().length > 0
          ? textBindingId
          : formBindingId;
      const bindingId =
        typeof bindingIdValue === "string" && bindingIdValue.trim().length > 0
          ? bindingIdValue.trim()
          : undefined;
      const update = await runtime.ragDemoState.setSyncSourceBindingSelection(
        context.params.id,
        user.sub,
        bindingId,
      );
      if (!update.ok) {
        return new Response(update.error, { status: 400 });
      }

      if (context.request.headers.get("accept")?.includes("application/json")) {
        const startup = runtime.startup.getSnapshot();
        return {
          mode: resolved.mode,
          startup: {
            elapsedMs: startup.elapsedMs,
            status: startup.status,
            summary: runtime.startup.formatSummary(startup),
          },
          syncSources: await runtime.indexManager.listSyncSources({
            userSub: user.sub,
          }),
        };
      }

      const opsResponse = await dispatchInternalRequest(
        new Request(`http://absolute.local${resolved.backend.path}/ops`, {
          headers: {
            "x-absolutejs-user-sub": user.sub,
          },
          method: "GET",
        }),
      );

      if (!opsResponse.ok) {
        return new Response(await opsResponse.text(), {
          status: opsResponse.status,
        });
      }

      const summary = bindingId
        ? "Updated linked binding selection for this source."
        : "Cleared linked binding selection for this source.";
      return [
        '<div id="mutation-status" hx-swap-oob="innerHTML">',
        '<div class="demo-results">',
        `<p class="demo-banner">${summary}</p>`,
        "</div>",
        "</div>",
        '<div id="htmx-ops" hx-swap-oob="innerHTML">',
        renderHtmxOpsPanel(await opsResponse.json(), resolved.mode),
        "</div>",
      ].join("");
    }),
  )
  .post("/demo/sync/:mode/:id", (context) =>
    context.protectRoute(async (user) => {
      const resolved = resolveDemoBackend(
        runtime.ragBackends,
        context.params.mode,
      );
      if ("error" in resolved) {
        return resolved.error;
      }

      const form = await context.request.formData().catch(() => null);
      const background =
        typeof form?.get("background") === "string" &&
        form.get("background") === "true";
      const syncResponse = await dispatchInternalRequest(
        new Request(
          `http://absolute.local${resolved.backend.path}/sync/${encodeURIComponent(context.params.id)}`,
          {
            body: background ? JSON.stringify({ background: true }) : undefined,
            headers: background
              ? {
                  "Content-Type": "application/json",
                  "x-absolutejs-user-sub": user.sub,
                }
              : {
                  "x-absolutejs-user-sub": user.sub,
                },
            method: "POST",
          },
        ),
      );

      if (!syncResponse.ok) {
        return new Response(await syncResponse.text(), {
          status: syncResponse.status,
        });
      }

      const opsResponse = await dispatchInternalRequest(
        new Request(`http://absolute.local${resolved.backend.path}/ops`, {
          headers: {
            "x-absolutejs-user-sub": user.sub,
          },
          method: "GET",
        }),
      );

      if (!opsResponse.ok) {
        return new Response(await opsResponse.text(), {
          status: opsResponse.status,
        });
      }

      const summary = background
        ? `Queued ${context.params.id} for background sync.`
        : `Synced ${context.params.id}.`;
      return [
        '<div id="mutation-status" hx-swap-oob="innerHTML">',
        '<div class="demo-results">',
        `<p class="demo-banner">${summary}</p>`,
        '<ul class="demo-detail-list">',
        "<li>Knowledge base operations refreshed with the latest source-level sync state.</li>",
        "<li>Diagnostics and indexed sources continue to refresh automatically on this route.</li>",
        "</ul>",
        "</div>",
        "</div>",
        '<div id="htmx-ops" hx-swap-oob="innerHTML">',
        renderHtmxOpsPanel(await opsResponse.json(), resolved.mode),
        "</div>",
      ].join("");
    }),
  )
  .use(networking)
  .on("error", (error) => {
    const { request } = error;
    console.error(
      `Server error on ${request.method} ${request.url}: ${error.message}`,
    );
  });

export const ragService = service;

handleInternalRequest = async (request) =>
  Promise.resolve(ragService.handle(request));

export type RagService = typeof ragService;

if (import.meta.main) {
  ragService.listen(getRagServicePort());
}
