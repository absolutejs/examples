import { status } from "elysia";
import { isBackendMode } from "../../../frontend/demo-backends";
import type { RagBackends } from "../plugins/pluginTypes";

export const resolveDemoBackend = (ragBackends: RagBackends, mode: string) => {
  if (!isBackendMode(mode)) {
    return { error: status(400, "Invalid backend mode") } as const;
  }

  const backend = ragBackends.backends[mode];
  if (!backend.available) {
    return {
      error: status(
        503,
        backend.reason ?? `Backend mode ${mode} is not available`,
      ),
    } as const;
  }

  return { backend, mode } as const;
};
