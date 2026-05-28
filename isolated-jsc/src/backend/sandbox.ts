import { Elysia, t } from "elysia";
import {
  MemoryLimitError,
  Reference,
  resolveIsolatePolicy,
  runIsolated,
  TimeoutError,
} from "@absolutejs/isolated-jsc";

/**
 * `/api/run` — compile + run a user-supplied JS expression inside a fresh
 * `@absolutejs/isolated-jsc` Isolate. The isolate gets:
 *
 * - `log(...)` — a host-side `Reference` we use to capture `console.log`
 *   output for display (the isolate's own `console.log` goes nowhere by
 *   default; we ask user code to call our `log` instead).
 * - `now()` — host-side `Date.now`, since JSC inside the worker still has
 *   real time but Convex-style apps may want a controlled clock. Demo of
 *   the Reference pattern.
 *
 * The isolate has NO host filesystem / network access through us. CPU and
 * memory are capped per-request via the body's `timeout` and `memoryLimit`.
 *
 * Each request uses `runIsolated()` to spawn, run, return metrics, and
 * dispose. That's clearest for a demo; hot paths should use
 * `createIsolatedRunner()` to pool by tenant/session and precompile callables.
 */

type RunOutput = {
  ok: boolean;
  result?: unknown;
  error?: { name: string; message: string };
  log: string[];
  durationMs: number;
  metrics?: {
    backend: "ffi" | "worker";
    cpuMs: number;
    heapBytes: number;
  };
};

const runOne = async (
  code: string,
  memoryLimitMb: number,
  timeoutMs: number,
): Promise<RunOutput> => {
  const startedAt = Date.now();
  const log: string[] = [];
  try {
    const policy = resolveIsolatePolicy("tenant-script", {
      allowWorkerFallback: true,
      memoryLimit: memoryLimitMb,
      timeout: timeoutMs,
    });
    const { metrics, result } = await runIsolated(
      `(async () => { ${code}\n})()`,
      {
        globals: {
          log: new Reference(((...args: unknown[]) => {
            log.push(args.map((arg) => stringify(arg)).join(" "));
          }) as (...args: unknown[]) => unknown),
          now: new Reference((() => Date.now()) as (
            ...args: unknown[]
          ) => unknown),
        },
        policy,
        withMetrics: true,
      },
    );
    return {
      ok: true,
      result,
      log,
      metrics,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: { name, message },
      log,
      durationMs: Date.now() - startedAt,
    };
  }
};

/** Render a value the way `console.log` would — JSON for plain objects,
 * `[Object]`-ish for things JSON can't represent. Cheap, no cycle-detect. */
const stringify = (value: unknown): string => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const sandboxPlugin = new Elysia().post(
  "/api/run",
  async ({ body }) => runOne(body.code, body.memoryLimitMb, body.timeoutMs),
  {
    body: t.Object({
      code: t.String({ maxLength: 64_000 }),
      memoryLimitMb: t.Number({ minimum: 16, maximum: 256, default: 64 }),
      timeoutMs: t.Number({ minimum: 50, maximum: 5_000, default: 500 }),
    }),
    response: t.Object({
      ok: t.Boolean(),
      result: t.Optional(t.Any()),
      error: t.Optional(t.Object({ name: t.String(), message: t.String() })),
      log: t.Array(t.String()),
      durationMs: t.Number(),
      metrics: t.Optional(
        t.Object({
          backend: t.Union([t.Literal("ffi"), t.Literal("worker")]),
          cpuMs: t.Number(),
          heapBytes: t.Number(),
        }),
      ),
    }),
  },
);

// Re-exported for tests / future expansion.
export { runOne, MemoryLimitError, TimeoutError };
