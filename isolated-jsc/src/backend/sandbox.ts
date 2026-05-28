import { Elysia, t } from "elysia";
import {
  createCapabilityAuditBuffer,
  createCapabilityBroker,
  defineCapabilityTool,
  type CapabilityAuditEvent,
  type CapabilityManifestEntry,
  type ExecutionReceipt,
  MemoryLimitError,
  Reference,
  ResultSizeError,
  resolveIsolatePolicy,
  runIsolated,
  TimeoutError,
} from "@absolutejs/isolated-jsc";
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/**
 * `/api/run` — compile + run a user-supplied JS expression inside a fresh
 * `@absolutejs/isolated-jsc` Isolate. The isolate gets:
 *
 * - `log(...)` / `now()` — host-side capabilities exposed through a
 *   capability broker. User code gets ergonomic References, while the host
 *   keeps a manifest and bounded audit events for receipts.
 * - `console.log(...)` — captured through the isolate `onConsole` hook with
 *   entry/byte limits so logs cannot grow without bound.
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
  audit: Array<
    Pick<
      CapabilityAuditEvent<{ tenantId: string }>,
      "status" | "tool" | "durationMs"
    >
  >;
  manifest?: CapabilityManifestEntry[];
  receipt?: ExecutionReceipt;
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
  const audit = createCapabilityAuditBuffer<{ tenantId: string }>({
    maxEvents: 32,
  });
  const broker = createCapabilityBroker(
    {
      log: defineCapabilityTool<unknown[], null, { tenantId: string }>({
        description: "Append one bounded line to the demo output log",
        input: "unknown[]",
        output: "null",
        redactAuditInput: (input) => {
          const args = Array.isArray(input) ? input : [input];
          return args.map((arg) =>
            typeof arg === "string" && arg.length <= 32
              ? arg
              : "[log arg redacted]",
          );
        },
        redactAuditOutput: () => null,
        risk: "read-only",
        timeoutMs: 100,
        validateInput: (input) => (Array.isArray(input) ? input : [input]),
        handler: (args) => {
          log.push(args.map((arg) => stringify(arg)).join(" "));
          return null;
        },
      }),
      now: defineCapabilityTool<undefined, number, { tenantId: string }>({
        description: "Read the host clock for this sandbox request",
        output: "number",
        risk: "read-only",
        timeoutMs: 100,
        validateInput: () => undefined,
        handler: () => Date.now(),
      }),
      echo: defineCapabilityTool<string, string, { tenantId: string }>({
        description: "Echo a bounded string through the capability broker",
        input: "string",
        maxOutputBytes: 1_024,
        output: "string",
        redactAuditInput: (input) =>
          typeof input === "string" && input.length <= 32
            ? input
            : "[echo input redacted]",
        redactAuditOutput: (output) =>
          typeof output === "string" && output.length <= 32
            ? output
            : "[echo output redacted]",
        risk: "read-only",
        timeoutMs: 100,
        validateInput: (input) => String(input),
        handler: (input) => input,
      }),
    },
    {
      context: { tenantId: "demo-tenant" },
      onAudit: audit.onAudit,
    },
  );
  const manifest = broker.manifest();
  try {
    const policy = resolveIsolatePolicy("tenant-script", {
      allowWorkerFallback: true,
      memoryLimit: memoryLimitMb,
      timeout: timeoutMs,
    });
    await ensureBundledWorkerBackendAsset();
    const { receipt, result } = await runIsolated(
      `(async () => { ${code}\n})()`,
      {
        backend: "worker",
        globals: {
          log: new Reference((async (...args: unknown[]) => {
            await broker.call("log", args);
          }) as (...args: unknown[]) => unknown),
          now: new Reference(
            (async () => await broker.call("now")) as (
              ...args: unknown[]
            ) => unknown,
          ),
          tools: broker.reference,
        },
        maxConsoleBytes: 512,
        maxConsoleEntries: 4,
        onConsole: (level, args) => {
          log.push(
            `[console.${level}] ${args.map((arg) => stringify(arg)).join(" ")}`,
          );
        },
        policy,
        run: {
          ...audit.receiptOptions(),
          executionId: crypto.randomUUID(),
          maxResultBytes: 16_384,
          purpose: "isolated-jsc-demo-run",
          tenant: "demo-tenant",
        },
        withReceipt: true,
      },
    );
    return {
      ok: true,
      result,
      audit: auditSummary(audit.events),
      log,
      manifest,
      metrics: receipt.metrics,
      receipt,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const message = error instanceof Error ? error.message : String(error);
    const receipt =
      error !== null && typeof error === "object" && "receipt" in error
        ? (error as { receipt?: ExecutionReceipt }).receipt
        : undefined;
    return {
      ok: false,
      error: { name, message },
      audit: auditSummary(audit.events),
      log,
      manifest,
      receipt,
      durationMs: Date.now() - startedAt,
    };
  }
};

const auditSummary = (
  audit: readonly CapabilityAuditEvent<{ tenantId: string }>[],
): RunOutput["audit"] =>
  audit.map((event) => ({
    durationMs: event.durationMs,
    status: event.status,
    tool: event.tool,
  }));

const ensureBundledWorkerBackendAsset = async (): Promise<void> => {
  if (!import.meta.url.endsWith("/dist/server.js")) return;
  const targetUrl = new URL("./worker.js", import.meta.url);
  const packageIndexUrl = import.meta.resolve("@absolutejs/isolated-jsc");
  const packageWorkerUrl = new URL("./worker.js", packageIndexUrl);
  await copyFile(fileURLToPath(packageWorkerUrl), fileURLToPath(targetUrl));
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
      audit: t.Array(t.Any()),
      manifest: t.Optional(t.Array(t.Any())),
      receipt: t.Optional(t.Any()),
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
export { runOne, MemoryLimitError, ResultSizeError, TimeoutError };
