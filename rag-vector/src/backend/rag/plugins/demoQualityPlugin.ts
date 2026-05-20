import { Elysia } from "elysia";
import { buildDemoEvaluationInput } from "../../../frontend/demo-backends";
import { renderHtmxQualityPanel } from "../handlers/htmxRagWorkflow";
import { resolveDemoBackend } from "../handlers/resolveDemoBackend";
import type {
  DemoInternalRequestHandler,
  DemoQualityController,
  RagBackends,
  RagStartupController,
} from "./pluginTypes";

export const createDemoQualityPlugin = ({
  handleInternalRequest,
  quality,
  ragBackends,
  startup,
}: {
  handleInternalRequest: DemoInternalRequestHandler;
  quality: DemoQualityController;
  ragBackends: RagBackends;
  startup: RagStartupController;
}) =>
  new Elysia()
    .get("/demo/quality/:mode", async ({ params }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      const ragStartup = startup.getSnapshot();
      if (ragStartup.status !== "ready") {
        return new Response(startup.formatSummary(ragStartup), { status: 503 });
      }

      return quality.buildDemoQualityResponse(resolved.mode);
    })
    .get("/demo/quality/:mode/htmx", async ({ params }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      const ragStartup = startup.getSnapshot();
      if (ragStartup.status !== "ready") {
        return startup.renderPendingPanel(
          "quality-results",
          "Retrieval Quality Warming Up",
          startup.formatSummary(ragStartup),
        );
      }

      return renderHtmxQualityPanel(
        await quality.buildDemoQualityResponse(resolved.mode),
      );
    })
    .post("/demo/evaluate/:mode", async ({ params }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      const ragStartup = startup.getSnapshot();
      if (ragStartup.status !== "ready") {
        return startup.renderPendingPanel(
          "evaluation-results",
          "Benchmark Warming Up",
          startup.formatSummary(ragStartup),
        );
      }

      return handleInternalRequest(
        new Request(`http://absolute.local${resolved.backend.path}/evaluate`, {
          body: JSON.stringify(buildDemoEvaluationInput()),
          headers: {
            "Content-Type": "application/json",
            "HX-Request": "true",
          },
          method: "POST",
        }),
      );
    });
