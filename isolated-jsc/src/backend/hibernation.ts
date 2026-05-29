/**
 * `/api/hibernate/*` — worked example for sync 0.9.0's
 * `createHibernatingIsolatePool`. The pool holds one context per
 * `key`; the panel POSTs user-written source for one of N keys, the
 * route runs it through `context.compileCallable + call`, and the
 * pool decides whether to spawn fresh, reuse the active context, or
 * wake from a hibernated checkpoint.
 *
 * The point of the demo is the data-vs-heap boundary: the user
 * writes `this.count = ...` and the value SURVIVES forced hibernate +
 * wake, because the checkpoint captures structured-cloneable own
 * globals. The callable itself recompiles on every call (cheap; the
 * isolate is fresh after wake), which the docs page calls out as the
 * footgun.
 */

import {
  createHibernatingIsolatePool,
  type HibernationEvent,
} from "@absolutejs/isolated-jsc";
import { Elysia, t } from "elysia";
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Production builds bundle src/backend/server.ts to dist/server.js but
// don't bring the package's worker.js along. The sandboxPlugin already
// refreshes it on /api/run; we mirror that here so the hibernation
// pool's first isolate can find the worker too. (Auto-backend in this
// example resolves to worker on most Linux/WSL setups where libJSC
// isn't readily available.) Idempotent + cheap; if we're not in the
// bundled build (e.g. dev mode), this is a no-op.
const ensureBundledWorkerBackendAsset = async (): Promise<void> => {
  if (!import.meta.url.endsWith("/dist/server.js")) return;
  const targetUrl = new URL("./worker.js", import.meta.url);
  const packageIndexUrl = import.meta.resolve("@absolutejs/isolated-jsc");
  const packageWorkerUrl = new URL("./worker.js", packageIndexUrl);
  await copyFile(
    fileURLToPath(packageWorkerUrl),
    fileURLToPath(targetUrl),
  );
};
// Run once on module load AND awaited on first call to be safe.
let workerAssetReady: Promise<void> | null = null;
const ensureWorker = () => {
  if (workerAssetReady === null) {
    workerAssetReady = ensureBundledWorkerBackendAsset();
  }
  return workerAssetReady;
};
void ensureWorker();

// Observable transition log so the panel + tests can show what the
// pool is doing under the hood. Bounded so a long-lived server doesn't
// keep growing.
const transitionLog: Array<HibernationEvent & { at: number }> = [];
const MAX_TRANSITIONS = 200;
const recordTransition = (event: HibernationEvent) => {
  transitionLog.push({ ...event, at: Date.now() });
  if (transitionLog.length > MAX_TRANSITIONS) {
    transitionLog.splice(0, transitionLog.length - MAX_TRANSITIONS);
  }
};

// One pool, in-memory store, idle threshold ~30s so the user can SEE
// the hibernation happen on its own without waiting. The panel
// surfaces a button to force it instantly too. Backend defaults to
// 'auto' so the pool works in both dev (no bundled worker.js) and
// production (sandboxPlugin copies the worker.js into dist on demand).
const pool = createHibernatingIsolatePool({
  hibernateAfterMs: 30_000,
  // 256 MB cap is comfortable on the Worker backend — checkpoint() does
  // some intra-context script work that pushes heap past 64 MB on Bun's
  // Worker runtime (the Worker process itself is ~120 MB at idle).
  isolate: { backend: "auto", memoryLimit: 256 },
  maxSize: 100,
  onTransition: recordTransition,
  sweepIntervalMs: 5_000,
});

export const hibernationPlugin = new Elysia({ prefix: "/api/hibernate" })
  .post(
    "/run",
    async ({ body }) => {
      await ensureWorker();
      const startedAt = performance.now();
      try {
        const value = await pool.run(body.key, async (context) => {
          const fn = await context.compileCallable(body.source);
          return await fn.call([{ args: body.args ?? null }]);
        });
        return {
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          ok: true,
          value: value as unknown,
        };
      } catch (error) {
        return {
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          error: {
            message: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : "Error",
          },
          ok: false,
        };
      }
    },
    {
      body: t.Object({
        // `({ args }) => ...` — the model/user writes the body. The
        // sandboxed `this` is the context's globalThis; `this.count =
        // ...` survives hibernation.
        args: t.Optional(t.Any()),
        key: t.String({ maxLength: 64 }),
        source: t.String({ maxLength: 16_000 }),
      }),
    },
  )
  .post(
    "/hibernate",
    async ({ body }) => {
      try {
        await pool.hibernate(body.key);
        return { ok: true };
      } catch (error) {
        return {
          error: {
            message: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : "Error",
          },
          ok: false,
        };
      }
    },
    {
      body: t.Object({
        key: t.String({ maxLength: 64 }),
      }),
    },
  )
  .get("/stats", () => ({
    stats: pool.stats(),
    transitions: transitionLog.slice(-30),
  }));

export { pool as hibernationPool };
