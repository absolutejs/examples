import { Elysia, status } from "elysia";
import { isBackendMode, isFrameworkId } from "../../../frontend/demo-backends";
import type {
  DemoAIProviderCatalog,
  DemoUIStateController,
} from "./pluginTypes";

export const createDemoUiStatePlugin = ({
  demoAIProvider,
  uiState,
}: {
  demoAIProvider: DemoAIProviderCatalog;
  uiState: DemoUIStateController;
}) =>
  new Elysia()
    .get("/demo/ai-models", () => ({
      defaultModelKey: demoAIProvider?.defaultModelKey ?? null,
      models: demoAIProvider?.models ?? [],
    }))
    .get("/demo/ui-state/recent-queries/:framework/:mode", ({ params }) => {
      if (!isFrameworkId(params.framework)) {
        return status(400, "Invalid framework id");
      }
      if (!isBackendMode(params.mode)) {
        return status(400, "Invalid backend mode");
      }

      return uiState.getRecentQueries(params.framework, params.mode);
    })
    .post(
      "/demo/ui-state/recent-queries/:framework/:mode",
      async ({ params, request }) => {
        if (!isFrameworkId(params.framework)) {
          return status(400, "Invalid framework id");
        }
        if (!isBackendMode(params.mode)) {
          return status(400, "Invalid backend mode");
        }

        const payload = await request.json().catch(() => null);
        if (!Array.isArray(payload)) {
          return status(400, "Invalid recent query payload");
        }

        uiState.setRecentQueries(params.framework, params.mode, payload);
        return { ok: true };
      },
    )
    .get("/demo/ui-state/active-retrieval/:framework/:mode", ({ params }) => {
      if (!isFrameworkId(params.framework)) {
        return status(400, "Invalid framework id");
      }
      if (!isBackendMode(params.mode)) {
        return status(400, "Invalid backend mode");
      }

      return uiState.getActiveRetrieval(params.framework, params.mode);
    })
    .post(
      "/demo/ui-state/active-retrieval/:framework/:mode",
      async ({ params, request }) => {
        if (!isFrameworkId(params.framework)) {
          return status(400, "Invalid framework id");
        }
        if (!isBackendMode(params.mode)) {
          return status(400, "Invalid backend mode");
        }

        const payload = await request.json().catch(() => null);
        if (!payload || typeof payload !== "object") {
          return status(400, "Invalid active retrieval payload");
        }

        uiState.setActiveRetrieval(
          params.framework,
          params.mode,
          payload as Record<string, unknown>,
        );
        return { ok: true };
      },
    )
    .get("/demo/ai-models/htmx", () => {
      const models = demoAIProvider?.models ?? [];
      const defaultModelKey = demoAIProvider?.defaultModelKey ?? "";
      if (models.length === 0) {
        return '<div id="stream-model-picker"><p class="demo-error">Configure an AI provider to enable retrieval streaming.</p></div>';
      }

      return [
        '<div id="stream-model-picker">',
        '<label for="stream-model-key">Answer model</label>',
        '<select id="stream-model-key" name="modelKey">',
        ...models.map(
          (model) =>
            `<option value="${model.key}"${model.key === defaultModelKey ? " selected" : ""}>${model.providerLabel} · ${model.label}</option>`,
        ),
        "</select>",
        '<p class="demo-metadata">Model switching stays on the official AbsoluteJS plugin path by selecting the provider and model sent with the retrieval stream request.</p>',
        "</div>",
      ].join("");
    });
