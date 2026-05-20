import { Elysia } from "elysia";
import { resolveDemoBackend } from "../handlers/resolveDemoBackend";
import type { RagBackends, RagStartupController } from "./pluginTypes";

export const createDemoReadinessPlugin = ({
  ragBackends,
  startup,
}: {
  ragBackends: RagBackends;
  startup: RagStartupController;
}) =>
  new Elysia()
    .get("/demo/rag-readiness/:mode/json", ({ params }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      return startup.getReadinessPayload();
    })
    .get("/demo/rag-readiness/:mode", ({ params }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      return startup.renderHeaderBadge(resolved.mode);
    });
