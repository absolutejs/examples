import { useState } from "react";
import { Head } from "@absolutejs/absolute/react/components";

type SandboxPageProps = {
  cssPath?: string;
};

type RunResult = {
  ok: boolean;
  result?: unknown;
  error?: { name: string; message: string };
  log: string[];
  audit: Array<{ status: string; tool: string; durationMs?: number }>;
  manifest?: Array<Record<string, unknown>>;
  policyRecipe?: {
    audit: Record<string, unknown>;
    broker: Record<string, unknown>;
    console: Record<string, unknown>;
    run: Record<string, unknown>;
    runner: Record<string, unknown>;
  };
  receipt?: {
    backend: "ffi" | "worker";
    capabilityCallsDropped?: number;
    capabilityCallsTruncated?: boolean;
    console: {
      bytes: number;
      entries: number;
      truncated: boolean;
      byteLimitExceeded: boolean;
      entryLimitExceeded: boolean;
    };
    durationMs: number;
    error?: { code?: string; message: string; name: string };
    executionId: string;
    outputBytes?: number;
    status: "success" | "error";
    timeoutMs: number;
  };
  durationMs: number;
  metrics?: {
    backend: "ffi" | "worker";
    cpuMs: number;
    heapBytes: number;
  };
};

// Quick canned snippets — each demonstrates one isolation guarantee.
type Preset = {
  label: string;
  description: string;
  code: string;
  timeoutMs?: number;
  memoryLimitMb?: number;
};

// User code runs as the body of an `async` function — use `return X` to
// hand a value back to the host.
const PRESETS: Preset[] = [
  {
    label: "Hello world",
    description:
      "Call a brokered host capability and emit bounded console output.",
    code: "await log('hello from inside the sandbox');\nconsole.log('captured console line');\nreturn 1 + 1;",
  },
  {
    label: "Host clock via Reference",
    description:
      "Call a host function (`now`) that returns Date.now(). The host implements the function; the sandbox just calls it.",
    code: "const t = await now();\nawait log('host says it is', t);\nreturn t;",
  },
  {
    label: "Runaway loop → TimeoutError",
    description:
      "Tight infinite loop. The configured timeout interrupts or terminates the isolate, depending on the backend.",
    code: "while (true) {}",
    timeoutMs: 200,
  },
  {
    label: "Memory bomb → MemoryLimitError",
    description:
      "Allocate ~500 MB of heap-resident strings. The host's memory cap fires.",
    code: `const big = [];
for (let i = 0; i < 50000; i++) {
  big.push({ k: i, v: 'x'.repeat(10000) });
  if (i % 200 === 0) await new Promise(r => setTimeout(r, 1));
}
return big.length;`,
    memoryLimitMb: 32,
    timeoutMs: 5000,
  },
  {
    label: "No host filesystem access",
    description:
      "Show the hardened default global shape: host capability globals are not exposed directly.",
    code: "return typeof fetch + ',' + typeof Bun + ',' + typeof process;",
  },
  {
    label: "Result limit → ResultSizeError",
    description:
      "Return a large value. The host rejects it before application code accepts the output.",
    code: "return 'x'.repeat(20000);",
  },
  {
    label: "Capability output limit → CapabilityError",
    description:
      "Ask a host capability to return too much data. The broker rejects it before sandbox code receives the value.",
    code: "return await tools('echo', 'x'.repeat(2000));",
  },
  {
    label: "Console limit → receipt flag",
    description:
      "Emit more console lines than the host forwards. The receipt records truncation.",
    code: "for (let i = 0; i < 8; i++) console.log('line', i);\nreturn 'console capped';",
  },
  {
    label: "Audit buffer → receipt flag",
    description:
      "Call a host capability repeatedly. The receipt records dropped audit events instead of retaining an unbounded array.",
    code: "for (let i = 0; i < 40; i++) await now();\nreturn 'audit capped';",
  },
  {
    label: "Policy recipe helpers",
    description:
      "Show the helper-built audit, broker, console, run, and runner defaults that wrap this sandbox request.",
    code: "await log('policy recipe helpers are wiring this request');\nreturn 'recipe helpers applied';",
  },
];

const formatResult = (result: unknown): string => {
  if (result === undefined) return "undefined";
  if (typeof result === "string") return JSON.stringify(result);
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
};

const SandboxContent = () => {
  const [code, setCode] = useState<string>(PRESETS[0]!.code);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(64);
  const [timeoutMs, setTimeoutMs] = useState<number>(500);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<number>(0);

  const loadPreset = (index: number) => {
    const preset = PRESETS[index];
    if (preset === undefined) return;
    setActivePreset(index);
    setCode(preset.code);
    if (preset.timeoutMs !== undefined) setTimeoutMs(preset.timeoutMs);
    if (preset.memoryLimitMb !== undefined)
      setMemoryLimitMb(preset.memoryLimitMb);
  };

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch("/api/run", {
        body: JSON.stringify({ code, memoryLimitMb, timeoutMs }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as RunResult;
      setResult(data);
    } catch (error) {
      setResult({
        audit: [],
        durationMs: 0,
        error: { message: String(error), name: "FetchError" },
        log: [],
        ok: false,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <main>
      <header className="page-header">
        <h1>@absolutejs/isolated-jsc</h1>
        <p className="lead">
          Run arbitrary JavaScript inside a heap-isolated JavaScriptCore
          sandbox. Wall-clock + memory caps are enforced from the host, and host
          functions are exposed as Reference call-throughs.
        </p>
      </header>

      <section className="presets">
        <h2>Canned snippets</h2>
        <p className="muted">
          Click one to load it, then hit Run. Each demonstrates a different
          isolation guarantee.
        </p>
        <ul className="preset-list">
          {PRESETS.map((preset, index) => (
            <li
              className={
                index === activePreset ? "preset preset-active" : "preset"
              }
              key={preset.label}
            >
              <button onClick={() => loadPreset(index)} type="button">
                <strong>{preset.label}</strong>
                <span>{preset.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="editor-pane">
        <div className="editor-col">
          <label htmlFor="code">
            Source{" "}
            <span className="muted">(use `return X` to hand a value back)</span>
          </label>
          <textarea
            id="code"
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            value={code}
          />
          <div className="limits">
            <label>
              memory (MB)
              <input
                max={256}
                min={16}
                onChange={(event) =>
                  setMemoryLimitMb(Number(event.target.value))
                }
                step={16}
                type="number"
                value={memoryLimitMb}
              />
            </label>
            <label>
              timeout (ms)
              <input
                max={5_000}
                min={50}
                onChange={(event) => setTimeoutMs(Number(event.target.value))}
                step={50}
                type="number"
                value={timeoutMs}
              />
            </label>
            <button
              className="primary"
              disabled={running}
              onClick={() => {
                void run();
              }}
              type="button"
            >
              {running ? "Running…" : "Run"}
            </button>
          </div>
        </div>

        <div className="result-col">
          <label>Result</label>
          <div className="result">
            {result === null ? (
              <p className="muted">Hit Run to execute.</p>
            ) : (
              <>
                <div
                  className={
                    result.ok ? "result-status ok" : "result-status err"
                  }
                >
                  {result.ok
                    ? `OK — ${result.durationMs} ms`
                    : `${result.error?.name ?? "Error"}: ${
                        result.error?.message ?? ""
                      } — ${result.durationMs} ms`}
                </div>
                {result.log.length > 0 && (
                  <>
                    <h3>captured output</h3>
                    <pre className="log">{result.log.join("\n")}</pre>
                  </>
                )}
                {result.manifest !== undefined && (
                  <>
                    <h3>capability manifest</h3>
                    <pre className="return">
                      {formatResult(result.manifest)}
                    </pre>
                  </>
                )}
                {result.policyRecipe !== undefined && (
                  <>
                    <h3>policy recipe helpers</h3>
                    <pre className="return">
                      {formatResult(result.policyRecipe)}
                    </pre>
                  </>
                )}
                {result.audit.length > 0 && (
                  <>
                    <h3>capability audit</h3>
                    <pre className="return">{formatResult(result.audit)}</pre>
                  </>
                )}
                {result.receipt !== undefined && (
                  <>
                    <h3>execution receipt</h3>
                    <pre className="return">{formatResult(result.receipt)}</pre>
                  </>
                )}
                {result.ok && (
                  <>
                    {result.metrics !== undefined && (
                      <>
                        <h3>metrics</h3>
                        <pre className="return">
                          {formatResult(result.metrics)}
                        </pre>
                      </>
                    )}
                    <h3>return value</h3>
                    <pre className="return">{formatResult(result.result)}</pre>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <HibernationPanel />

      <footer className="footer">
        <p>
          Built on{" "}
          <a
            href="https://github.com/absolutejs/isolated-jsc"
            rel="noopener noreferrer"
            target="_blank"
          >
            @absolutejs/isolated-jsc
          </a>{" "}
          — a JavaScriptCore-native sandbox for Bun (since isolated-vm requires
          V8 ABI symbols Bun's JSC doesn't have).
        </p>
      </footer>
    </main>
  );
};

// @absolutejs/isolated-jsc@0.9.0 — pool hibernation worked demo.
// Drives /api/hibernate/run, /api/hibernate/hibernate, /api/hibernate/stats.
// The key point of the demo is: type `this.count = (this.count ?? 0) + 1`,
// hit Run a few times → count climbs. Click "Hibernate" → the pool
// checkpoints the context and disposes the isolate. Hit Run again → count
// resumes from the checkpoint. The callable RECOMPILES on wake (cheap;
// the data survives, the code doesn't).
const DEFAULT_HIBERNATION_SOURCE = `// Anything you assign to globalThis is structured-cloneable, so it
// survives hibernation + wake. (Arrow function 'this' is unreliable
// under strict-mode bundling — use globalThis for the demo.)
({ args }) => {
  globalThis.count = (globalThis.count ?? 0) + 1;
  globalThis.lastRunAt = Date.now();
  return { count: globalThis.count, lastRunAt: globalThis.lastRunAt };
}`;

type HibernationRunResponse =
  | { ok: true; value: unknown; durationMs: number }
  | {
      ok: false;
      error: { name: string; message: string };
      durationMs: number;
    };

type HibernationStats = {
  stats: { active: number; hibernated: number; total: number };
  transitions: Array<{
    type: "wake" | "hibernate" | "evict";
    key: string;
    at: number;
    byteLength?: number;
    from?: "active" | "hibernated";
  }>;
};

const HibernationPanel = () => {
  const [key, setKey] = useState("tenant-a");
  const [source, setSource] = useState(DEFAULT_HIBERNATION_SOURCE);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<HibernationRunResponse | null>(null);
  const [stats, setStats] = useState<HibernationStats | null>(null);

  const refreshStats = async () => {
    const response = await fetch("/api/hibernate/stats");
    if (response.ok) {
      setStats((await response.json()) as HibernationStats);
    }
  };

  const run = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/hibernate/run", {
        body: JSON.stringify({ key, source }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const json = (await response.json()) as HibernationRunResponse;
      setOutcome(json);
      await refreshStats();
    } finally {
      setBusy(false);
    }
  };

  const hibernateNow = async () => {
    setBusy(true);
    try {
      await fetch("/api/hibernate/hibernate", {
        body: JSON.stringify({ key }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      await refreshStats();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="editor-pane" data-testid="hibernation-panel">
      <h2>Pool hibernation (0.9.0)</h2>
      <p>
        <code>createHibernatingIsolatePool</code> with{" "}
        <code>hibernateAfterMs: 30_000</code>. Pick a key, Run a few times
        — <code>this.count</code> climbs. Hibernate Now — the context's data
        is checkpointed, the isolate is disposed, the pool's stats show one
        less <code>active</code> and one more <code>hibernated</code>. Run
        again — count resumes from the checkpoint. The callable recompiles
        on wake; the data survived because it's structured-cloneable.
      </p>
      <div className="presence-bar" style={{ marginBottom: "8px" }}>
        <label style={{ marginRight: "8px" }}>
          Key:{" "}
          <select
            data-testid="hibernation-key"
            onChange={(event) => setKey(event.target.value)}
            value={key}
          >
            <option value="tenant-a">tenant-a</option>
            <option value="tenant-b">tenant-b</option>
            <option value="tenant-c">tenant-c</option>
          </select>
        </label>
        <button
          data-testid="hibernation-run"
          disabled={busy}
          onClick={() => void run()}
          type="button"
        >
          {busy ? "Working…" : "Run"}
        </button>
        <button
          data-testid="hibernation-hibernate"
          disabled={busy}
          onClick={() => void hibernateNow()}
          style={{ marginLeft: "8px" }}
          type="button"
        >
          Hibernate Now
        </button>
        <button
          data-testid="hibernation-refresh"
          disabled={busy}
          onClick={() => void refreshStats()}
          style={{ marginLeft: "8px" }}
          type="button"
        >
          Refresh stats
        </button>
      </div>
      <textarea
        aria-label="Hibernation source"
        data-testid="hibernation-source"
        onChange={(event) => setSource(event.target.value)}
        rows={6}
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: "0.85em",
          marginBottom: "8px",
          width: "100%",
        }}
        value={source}
      />
      {outcome !== null && (
        <div data-testid="hibernation-output">
          {outcome.ok ? (
            <>
              <strong>Result</strong>{" "}
              <span className="muted">· {outcome.durationMs} ms</span>
              <pre
                data-testid="hibernation-result"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: "4px",
                  margin: 0,
                  padding: "6px",
                }}
              >
                {JSON.stringify(outcome.value, null, 2)}
              </pre>
            </>
          ) : (
            <pre data-testid="hibernation-error" style={{ color: "#f87171" }}>
              {outcome.error.name}: {outcome.error.message}
            </pre>
          )}
        </div>
      )}
      {stats !== null && (
        <div data-testid="hibernation-stats" style={{ marginTop: "12px" }}>
          <strong>Pool</strong>{" "}
          <span data-testid="hibernation-stats-active">
            active: {stats.stats.active}
          </span>{" "}
          ·{" "}
          <span data-testid="hibernation-stats-hibernated">
            hibernated: {stats.stats.hibernated}
          </span>{" "}
          · total: {stats.stats.total}
          {stats.transitions.length > 0 && (
            <ul
              data-testid="hibernation-transitions"
              style={{ fontSize: "0.85em", marginTop: "6px" }}
            >
              {stats.transitions
                .slice(-5)
                .reverse()
                .map((event, index) => (
                  <li key={index}>
                    <code>{event.type}</code> · {event.key}
                    {event.from !== undefined ? ` · from ${event.from}` : ""}
                    {event.byteLength !== undefined
                      ? ` · ${event.byteLength} B`
                      : ""}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export const SandboxPage = ({ cssPath }: SandboxPageProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="@absolutejs/isolated-jsc" />
    <body>
      <SandboxContent />
    </body>
  </html>
);
