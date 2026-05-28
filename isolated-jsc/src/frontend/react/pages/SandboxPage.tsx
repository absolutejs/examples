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
      "Call the host-injected `log` Reference. Output appears in the right panel.",
    code: "await log('hello from inside the sandbox');\nreturn 1 + 1;",
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
                    <h3>console (via host Reference)</h3>
                    <pre className="log">{result.log.join("\n")}</pre>
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

export const SandboxPage = ({ cssPath }: SandboxPageProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="@absolutejs/isolated-jsc" />
    <body>
      <SandboxContent />
    </body>
  </html>
);
