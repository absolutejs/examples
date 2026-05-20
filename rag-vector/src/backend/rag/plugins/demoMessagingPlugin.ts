import { Elysia } from "elysia";
import { resolveDemoBackend } from "../handlers/resolveDemoBackend";
import type {
  DemoAIProviderCatalog,
  DemoInternalRequestHandler,
  RagBackends,
  RagStartupController,
} from "./pluginTypes";

export const createDemoMessagingPlugin = ({
  demoAIProvider,
  handleInternalRequest,
  ragBackends,
  startup,
}: {
  demoAIProvider: DemoAIProviderCatalog;
  handleInternalRequest: DemoInternalRequestHandler;
  ragBackends: RagBackends;
  startup: RagStartupController;
}) =>
  new Elysia()
    .post("/demo/message/:mode", async ({ body, params }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      const ragStartup = startup.getSnapshot();
      if (ragStartup.status !== "ready") {
        return startup.renderPendingPanel(
          "stream-thread",
          "Retrieval Stream Warming Up",
          startup.formatSummary(ragStartup),
        );
      }

      const content =
        body &&
        typeof body === "object" &&
        typeof (body as Record<string, unknown>).content === "string"
          ? String((body as Record<string, unknown>).content)
          : "";
      const modelKey =
        body &&
        typeof body === "object" &&
        typeof (body as Record<string, unknown>).modelKey === "string"
          ? String((body as Record<string, unknown>).modelKey)
          : (demoAIProvider?.defaultModelKey ?? "");
      const firstColon = modelKey.indexOf(":");
      const providerId = firstColon > 0 ? modelKey.slice(0, firstColon) : "";
      const modelId = firstColon > 0 ? modelKey.slice(firstColon + 1) : "";
      const prefixedContent =
        providerId && modelId ? `${providerId}:${modelId}:${content}` : content;
      const messageBody = new URLSearchParams();
      messageBody.set("content", prefixedContent);

      return handleInternalRequest(
        new Request(`http://absolute.local${resolved.backend.path}/message`, {
          body: messageBody.toString(),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "HX-Request": "true",
          },
          method: "POST",
        }),
      );
    })
    .post("/demo/message/:mode/search", async ({ body, params, request }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      const ragStartup = startup.getSnapshot();
      if (ragStartup.status !== "ready") {
        return startup.renderPendingPanel(
          "search-results",
          "Retrieval Warming Up",
          startup.formatSummary(ragStartup),
        );
      }

      const searchPayload: Record<string, unknown> = { includeTrace: true };
      if (body && typeof body === "object") {
        for (const [key, value] of Object.entries(
          body as Record<string, unknown>,
        )) {
          if (value != null) {
            searchPayload[key] = value;
          }
        }
      }

      const filter: Record<string, string> = {};
      if (searchPayload.filter && typeof searchPayload.filter === "object") {
        for (const [key, value] of Object.entries(
          searchPayload.filter as Record<string, unknown>,
        )) {
          if (typeof value === "string" && value.trim().length > 0) {
            filter[key] = value;
          }
        }
      }
      for (const key of ["kind", "source", "documentId"] as const) {
        const value = searchPayload[key];
        if (typeof value === "string" && value.trim().length > 0) {
          filter[key] = value;
        }
        delete searchPayload[key];
      }
      if (Object.keys(filter).length > 0) {
        searchPayload.filter = filter;
      } else {
        delete searchPayload.filter;
      }

      const retrievalPresetId =
        typeof searchPayload.retrievalPresetId === "string" &&
        searchPayload.retrievalPresetId.trim().length > 0
          ? searchPayload.retrievalPresetId.trim()
          : undefined;
      delete searchPayload.retrievalPresetId;

      const targetPath =
        retrievalPresetId === "hybrid-transform"
          ? `${resolved.backend.path}-transform/search`
          : `${resolved.backend.path}/search`;
      if (
        retrievalPresetId === "hybrid-transform" &&
        typeof searchPayload.retrieval === "undefined"
      ) {
        searchPayload.retrieval = "hybrid";
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json;charset=UTF-8",
      };
      if (request.headers.get("HX-Request") === "true") {
        headers["HX-Request"] = "true";
      }

      return handleInternalRequest(
        new Request(`http://absolute.local${targetPath}`, {
          body: JSON.stringify(searchPayload),
          headers,
          method: "POST",
        }),
      );
    });
