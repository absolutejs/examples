import { Elysia, status } from "elysia";
import { renderHtmxReleasePanel } from "../handlers/htmxRagWorkflow";
import { resolveDemoBackend } from "../handlers/resolveDemoBackend";
import type {
  DemoInternalRequestHandler,
  RagBackends,
  ReleaseDemoController,
} from "./pluginTypes";

const releaseActionMessages: Record<string, string> = {
  "switch-to-blocked-scenario":
    "Switched the release demo to the blocked stable lane.",
  "switch-to-blocked-general-scenario":
    "Switched the release demo to the blocked stable lane.",
  "switch-to-blocked-multivector-scenario":
    "Switched the release demo to the blocked stable lane.",
  "switch-to-ready-scenario":
    "Switched the release demo to the promotable stable lane.",
  "switch-to-completed-scenario":
    "Switched the release demo to the completed stable handoff.",
  "reset-release-demo":
    "Reset the release demo back to the blocked stable lane.",
  "inspect-release-status": "Loaded the published release status workflow.",
  "inspect-release-drift": "Loaded the published release drift workflow.",
  "run-remediation-drill":
    "Ran the remediation drill through the published remediation execution workflows.",
  "run-policy-history-drill":
    "Loaded the published policy history workflows for release, gate, escalation, and handoff controls.",
  "run-incident-drill":
    "Ran the incident drill through the published incident workflows.",
  "run-promote-revert-drill":
    "Ran the promote and revert drill through the published baseline workflows.",
  "run-handoff-completion-drill":
    "Ran the stable handoff completion drill through the published handoff workflows.",
  "run-handoff-incident-drill":
    "Ran the stale handoff incident drill through the published handoff incident workflows.",
  "promote-stable-candidate":
    "Promoted the stable candidate through the published workflow.",
  "revert-stable-baseline":
    "Reverted the stable baseline through the published workflow.",
  "approve-stable-override":
    "Approved the stable candidate through the published workflow.",
  "reject-stable-candidate":
    "Rejected the stable candidate through the published workflow.",
  "acknowledge-open-incident": "Acknowledged the current release incident.",
  "resolve-open-incident": "Resolved the current release incident.",
  "inspect-stable-handoffs": "Loaded the published handoff status workflow.",
  "approve-stable-handoff":
    "Approved the stable handoff through the published workflow.",
  "complete-stable-handoff":
    "Completed the stable handoff through the published workflow.",
};

export const createDemoReleasePlugin = ({
  handleInternalRequest,
  ragBackends,
  releaseDemo,
}: {
  handleInternalRequest: DemoInternalRequestHandler;
  ragBackends: RagBackends;
  releaseDemo: ReleaseDemoController;
}) =>
  new Elysia()
    .get("/demo/release/:mode", async ({ params, request }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      try {
        return await releaseDemo.buildReleaseResponse(
          resolved.mode,
          new URL(request.url).searchParams.get("workspace") === "beta"
            ? "beta"
            : "alpha",
          (internalRequest) => handleInternalRequest(internalRequest),
        );
      } catch (error) {
        return status(
          500,
          error instanceof Error ? error.message : String(error),
        );
      }
    })
    .get("/demo/release/:mode/htmx", async ({ params, request }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      try {
        return renderHtmxReleasePanel(
          await releaseDemo.buildReleaseResponse(
            resolved.mode,
            new URL(request.url).searchParams.get("workspace") === "beta"
              ? "beta"
              : "alpha",
            (internalRequest) => handleInternalRequest(internalRequest),
          ),
          undefined,
          resolved.mode,
        );
      } catch (error) {
        return status(
          500,
          error instanceof Error ? error.message : String(error),
        );
      }
    })
    .post("/demo/release/:mode/action", async ({ body, params, request }) => {
      const resolved = resolveDemoBackend(ragBackends, params.mode);
      if ("error" in resolved) {
        return resolved.error;
      }

      const parsedBody = body as
        | { actionId?: string; workspace?: string }
        | URLSearchParams
        | FormData
        | string
        | null;
      let workspace: "alpha" | "beta" =
        new URL(request.url).searchParams.get("workspace") === "beta"
          ? "beta"
          : "alpha";
      let actionId: string | undefined;
      if (typeof parsedBody === "string") {
        const bodyParams = new URLSearchParams(parsedBody);
        actionId = bodyParams.get("actionId") ?? undefined;
        workspace = bodyParams.get("workspace") === "beta" ? "beta" : workspace;
      } else if (parsedBody instanceof URLSearchParams) {
        actionId = parsedBody.get("actionId") ?? undefined;
        workspace = parsedBody.get("workspace") === "beta" ? "beta" : workspace;
      } else if (parsedBody instanceof FormData) {
        const value = parsedBody.get("actionId");
        actionId = typeof value === "string" ? value : undefined;
        const workspaceValue = parsedBody.get("workspace");
        workspace =
          typeof workspaceValue === "string" && workspaceValue === "beta"
            ? "beta"
            : workspace;
      } else if (parsedBody && typeof parsedBody === "object") {
        actionId =
          typeof parsedBody.actionId === "string"
            ? parsedBody.actionId
            : undefined;
        workspace = parsedBody.workspace === "beta" ? "beta" : workspace;
      }

      if (!actionId) {
        return status(400, "Missing actionId");
      }

      try {
        const release = await releaseDemo.handleAction({
          actionId,
          handleInternal: (internalRequest) =>
            handleInternalRequest(internalRequest),
          mode: resolved.mode,
          workspace,
        });

        const actionMessage = releaseActionMessages[actionId] ?? actionId;

        if (request.headers.get("hx-request") === "true") {
          return renderHtmxReleasePanel(release, actionMessage, resolved.mode);
        }

        return {
          message: actionMessage,
          ok: true,
          release,
        };
      } catch (error) {
        return status(
          500,
          error instanceof Error ? error.message : String(error),
        );
      }
    });
