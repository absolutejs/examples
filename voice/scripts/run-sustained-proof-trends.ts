export {};

import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildVoiceProofTrendProfileSummaries,
  buildVoiceProofTrendReport,
  type VoiceProofTrendProfileSummary,
  type VoiceProofTrendReport,
} from "@absolutejs/voice";

type JsonRecord = Record<string, unknown>;

type TrendCycle = {
  at: string;
  cycle: number;
  liveLatency?: TrendMetric;
  ok: boolean;
  opsRecovery?: {
    issues?: number;
    status?: string;
  };
  productionReadiness?: {
    failingChecks?: Array<{
      detail?: string;
      label?: string;
      status?: string;
    }>;
    status?: string;
  };
  providerSlo?: {
    events?: number;
    eventsWithLatency?: number;
    issues?: number;
    kinds: Record<string, TrendMetric & { status?: string }>;
    status?: string;
  };
  providers?: TrendProvider[];
  runtimeChannel?: {
    maxBackpressureEvents?: number;
    maxFirstAudioLatencyMs?: number;
    maxInterruptionP95Ms?: number;
    maxJitterMs?: number;
    maxTimestampDriftMs?: number;
    samples?: number;
    status?: string;
  };
  turnLatency?: TrendMetric & {
    status?: string;
    total?: number;
  };
};

type TrendProvider = TrendMetric & {
  id: string;
  label?: string;
  role?: string;
  status?: string;
};

type TrendMetric = {
  averageMs?: number;
  p50Ms?: number;
  p95Ms?: number;
  samples?: number;
};

const baseUrl = (
  process.env.VOICE_DEMO_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3004"}`
).replace(/\/$/, "");
const cycles = Math.max(1, Number(process.env.VOICE_TREND_CYCLES ?? 6));
const intervalMs = Math.max(0, Number(process.env.VOICE_TREND_INTERVAL_MS ?? 750));
const liveLatencySamplesPerCycle = Math.max(
  1,
  Number(process.env.VOICE_TREND_LIVE_SAMPLES_PER_CYCLE ?? 50),
);
const waitTimeoutMs = Number(process.env.VOICE_TREND_SERVER_WAIT_MS ?? 30_000);
const pollMs = Number(process.env.VOICE_TREND_SERVER_POLL_MS ?? 500);
const outputRoot =
  process.env.VOICE_TREND_OUTPUT_DIR ?? ".voice-runtime/proof-trends";
const realCallProfileRoot =
  process.env.VOICE_REAL_CALL_PROFILE_OUTPUT_DIR ??
  ".voice-runtime/real-call-profiles";
const runId = new Date().toISOString().replaceAll(":", "-");
const outputDir = join(outputRoot, runId);
const profileHistoryMaxAgeMs = 10 * 365 * 24 * 60 * 60 * 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const readArray = (value: unknown) => (Array.isArray(value) ? value : []);

const readMetric = (record: JsonRecord | undefined, keys: string[]) => {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const value = readNumber(record[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
};

const readMetricActual = (record: JsonRecord | undefined, key: string) => {
  const direct = readNumber(record?.[key]);
  if (direct !== undefined) {
    return direct;
  }
  const metric = record && isRecord(record[key]) ? record[key] : undefined;
  return readNumber(metric?.actual);
};

const percentile = (values: number[], percentileValue: number) => {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index];
};

const fetchJson = async (
  path: string,
  init: RequestInit = {},
): Promise<JsonRecord> => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      accept: "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  const body = await response.json();
  return isRecord(body) ? body : {};
};

const pingServer = async () => {
  await fetchJson("/api/production-readiness");
};

const isServerRunning = async () => {
  try {
    await pingServer();
    return true;
  } catch {
    return false;
  }
};

const waitForServer = async (server?: ReturnType<typeof Bun.spawn>) => {
  const deadline = Date.now() + waitTimeoutMs;
  let lastError = "Server did not respond.";
  let serverExited = false;
  let serverExitCode: number | undefined;

  if (server) {
    void server.exited.then((exitCode) => {
      serverExited = true;
      serverExitCode = exitCode;
    });
  }

  while (Date.now() < deadline) {
    if (serverExited) {
      throw new Error(
        `Dev server exited before trends could run with code ${serverExitCode ?? "unknown"}: ${lastError}`,
      );
    }

    try {
      await pingServer();
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await Promise.race([
      sleep(pollMs),
      server?.exited.then((exitCode) => {
        serverExited = true;
        serverExitCode = exitCode;
      }),
    ]);
  }

  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError}`);
};

const seedLiveLatencySamples = async (cycle: number) => {
  const now = Date.now();
  await Promise.all(
    Array.from({ length: liveLatencySamplesPerCycle }, (_, index) => {
      const latencyMs = 280 + cycle * 11 + index * 5;
      const startedAt = now - latencyMs;
      return fetchJson("/api/live-turn-latency", {
        body: JSON.stringify({
          assistantTextAt: now,
          completedAt: now,
          id: `trend-live-latency-${runId}-${cycle}-${index}`,
          latencyMs,
          sessionId: `trend-live-latency-${runId}-${cycle}`,
          startedAt,
          status: latencyMs <= 800 ? "pass" : "warn",
          thresholdMs: 800,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    }),
  );
};

const seedCycle = async (cycle: number) => {
  await Promise.all([
    fetchJson("/api/turn-latency/proof", { method: "POST" }),
    fetchJson("/api/turn-latency/proof", { method: "POST" }),
    fetchJson("/api/provider-slo/proof", { method: "POST" }),
    seedLiveLatencySamples(cycle),
  ]);
};

const summarizeProviderSlo = (body: JsonRecord) => {
  const kinds = isRecord(body.kinds) ? body.kinds : {};
  const providerRows = ["llm", "stt", "tts"].map((kind) => {
    const row = isRecord(kinds[kind]) ? rowToProvider(kind, kinds[kind]) : undefined;
    return row;
  }).filter((row): row is TrendProvider => row !== undefined);

  return {
    events: readNumber(body.events),
    eventsWithLatency: readNumber(body.eventsWithLatency),
    issues: readArray(body.issues).length,
    kinds: Object.fromEntries(
      ["llm", "stt", "tts"].map((kind) => {
        const row = isRecord(kinds[kind]) ? kinds[kind] : {};
        const metrics = isRecord(row.metrics) ? row.metrics : row;
        return [
          kind,
          {
            averageMs:
              readMetric(row, ["averageMs"]) ??
              readMetricActual(metrics, "averageElapsedMs"),
            p50Ms:
              readMetric(row, ["p50Ms"]) ?? readMetricActual(metrics, "p50ElapsedMs"),
            p95Ms:
              readMetric(row, ["p95Ms"]) ?? readMetricActual(metrics, "p95ElapsedMs"),
            samples: readMetric(row, ["eventsWithLatency", "samples"]),
            status: typeof row.status === "string" ? row.status : undefined,
          },
        ];
      }),
    ),
    providers: providerRows,
    status: typeof body.status === "string" ? body.status : undefined,
  };
};

const rowToProvider = (kind: string, value: unknown): TrendProvider | undefined => {
  const row = isRecord(value) ? value : {};
  const metrics = isRecord(row.metrics) ? row.metrics : row;
  const providers = readArray(row.providers)
    .map((provider) => (typeof provider === "string" ? provider : undefined))
    .filter((provider): provider is string => provider !== undefined);
  const id = providers.length > 0 ? `${kind}:${providers.join("+")}` : kind;
  return {
    averageMs:
      readMetric(row, ["averageMs"]) ??
      readMetricActual(metrics, "averageElapsedMs"),
    id,
    label: providers.length > 0 ? `${kind.toUpperCase()} ${providers.join(" + ")}` : `${kind.toUpperCase()} provider path`,
    p50Ms:
      readMetric(row, ["p50Ms"]) ?? readMetricActual(metrics, "p50ElapsedMs"),
    p95Ms:
      readMetric(row, ["p95Ms"]) ?? readMetricActual(metrics, "p95ElapsedMs"),
    role: kind,
    samples: readMetric(row, ["eventsWithLatency", "samples"]),
    status: typeof row.status === "string" ? row.status : undefined,
  };
};

const summarizeTurnLatency = (body: JsonRecord) => {
  const totals = readArray(body.turns)
    .map((turn) => (isRecord(turn) ? readNumber(turn.totalMs) : undefined))
    .filter((value): value is number => value !== undefined);

  return {
    averageMs:
      readMetric(body, ["averageTotalMs", "averageMs"]) ??
      (totals.length
        ? Math.round(totals.reduce((total, value) => total + value, 0) / totals.length)
        : undefined),
    p50Ms: readMetric(body, ["p50TotalMs", "p50Ms"]) ?? percentile(totals, 50),
    p95Ms: readMetric(body, ["p95TotalMs", "p95Ms"]) ?? percentile(totals, 95),
    samples: readMetric(body, ["total", "samples"]),
    status: typeof body.status === "string" ? body.status : undefined,
    total: readNumber(body.total),
  };
};

const summarizeLiveLatency = (body: JsonRecord) => ({
  averageMs: readMetric(body, ["averageLatencyMs", "averageMs"]),
  p50Ms: readMetric(body, ["p50LatencyMs", "p50Ms"]),
  p95Ms: readMetric(body, ["p95LatencyMs", "p95Ms"]),
  samples: readMetric(body, ["total", "samples"]),
});

const summarizeRuntimeChannel = (body: JsonRecord) => {
  const calibration = isRecord(body.calibration) ? body.calibration : {};
  const interruption = isRecord(body.interruption) ? body.interruption : {};
  const quality = isRecord(body.quality) ? body.quality : {};
  const transport = isRecord(body.transport) ? body.transport : {};
  const latencies = readArray(interruption.latenciesMs)
    .map((value) => readNumber(value))
    .filter((value): value is number => value !== undefined);

  return {
    maxBackpressureEvents:
      readNumber(transport.backpressureEvents) ??
      readNumber(quality.backpressureEvents),
    maxFirstAudioLatencyMs: readNumber(calibration.firstAudioLatencyMs),
    maxInterruptionP95Ms: percentile(latencies, 95),
    maxJitterMs: readNumber(quality.jitterMs),
    maxTimestampDriftMs: readNumber(quality.timestampDriftMs),
    samples:
      readNumber(body.frames) ??
      readNumber(calibration.inputAudioFrames) ??
      readNumber(calibration.assistantAudioFrames),
    status: typeof body.status === "string" ? body.status : undefined,
  };
};

const runCycle = async (cycle: number): Promise<TrendCycle> => {
  await seedCycle(cycle);
  const [
    providerSlo,
    turnLatency,
    liveLatency,
    runtimeChannel,
    opsRecovery,
    productionReadiness,
  ] = await Promise.all([
    fetchJson("/api/voice/provider-slos"),
    fetchJson("/api/turn-latency"),
    fetchJson("/api/live-latency"),
    fetchJson("/api/voice/media-pipeline-calibration"),
    fetchJson("/api/voice/ops-recovery"),
    fetchJson("/api/production-readiness"),
  ]);

  const summarizedProviderSlo = summarizeProviderSlo(providerSlo);
  const summarizedTurnLatency = summarizeTurnLatency(turnLatency);
  const summarizedLiveLatency = summarizeLiveLatency(liveLatency);
  const summarizedRuntimeChannel = summarizeRuntimeChannel(runtimeChannel);
  const opsIssues = readArray(opsRecovery.issues).length;
  const readinessStatus =
    typeof productionReadiness.status === "string"
      ? productionReadiness.status
      : undefined;
  const failingReadinessChecks = readArray(productionReadiness.checks)
    .filter(
      (check): check is JsonRecord =>
        isRecord(check) && check.status !== "pass",
    )
    .map((check) => ({
      detail: typeof check.detail === "string" ? check.detail : undefined,
      label: typeof check.label === "string" ? check.label : undefined,
      status: typeof check.status === "string" ? check.status : undefined,
    }));
  const providerIssues = summarizedProviderSlo.issues ?? 0;

  return {
    at: new Date().toISOString(),
    cycle,
    liveLatency: summarizedLiveLatency,
    ok:
      readinessStatus === "pass" &&
      summarizedProviderSlo.status === "pass" &&
      summarizedRuntimeChannel.status === "pass" &&
      summarizedTurnLatency.status === "pass" &&
      opsIssues === 0 &&
      providerIssues === 0,
    opsRecovery: {
      issues: opsIssues,
      status: typeof opsRecovery.status === "string" ? opsRecovery.status : undefined,
    },
    productionReadiness: {
      failingChecks: failingReadinessChecks,
      status: readinessStatus,
    },
    providerSlo: summarizedProviderSlo,
    providers: summarizedProviderSlo.providers,
    runtimeChannel: summarizedRuntimeChannel,
    turnLatency: summarizedTurnLatency,
  };
};

const maxOf = <T>(items: T[], read: (item: T) => number | undefined) => {
  const values = items.map(read).filter((value): value is number => value !== undefined);
  return values.length ? Math.max(...values) : undefined;
};

const summarizeProviders = (cycles: TrendCycle[]) => {
  const providersById = new Map<string, TrendProvider>();
  for (const cycle of cycles) {
    for (const provider of cycle.providers ?? []) {
      const existing = providersById.get(provider.id);
      providersById.set(provider.id, {
        averageMs: maxOf([existing, provider], (item) => item?.averageMs),
        id: provider.id,
        label: existing?.label ?? provider.label,
        p50Ms: maxOf([existing, provider], (item) => item?.p50Ms),
        p95Ms: maxOf([existing, provider], (item) => item?.p95Ms),
        role: existing?.role ?? provider.role,
        samples: (existing?.samples ?? 0) + (provider.samples ?? 0),
        status:
          existing?.status === "fail" || provider.status === "fail"
            ? "fail"
            : existing?.status === "warn" || provider.status === "warn"
              ? "warn"
              : provider.status ?? existing?.status,
      });
    }
  }
  return [...providersById.values()].sort(
    (left, right) =>
      (left.p95Ms ?? Number.POSITIVE_INFINITY) -
      (right.p95Ms ?? Number.POSITIVE_INFINITY),
  );
};

const lastOf = <T>(items: T[]) => items.at(-1);

const renderMs = (value?: number) => (value === undefined ? "n/a" : `${Math.round(value)}ms`);

const renderMarkdown = (
  cycles: TrendCycle[],
  profiles: VoiceProofTrendProfileSummary[],
) => {
  const latest = lastOf(cycles);
  const ok = cycles.every((cycle) => cycle.ok);
  const maxTurnP95 = maxOf(cycles, (cycle) => cycle.turnLatency?.p95Ms);
  const maxLiveP95 = maxOf(cycles, (cycle) => cycle.liveLatency?.p95Ms);
  const maxProviderP95 = maxOf(cycles, (cycle) =>
    maxOf(cycle.providers ?? [], (provider) => provider.p95Ms),
  );
  const maxRuntimeFirstAudio = maxOf(
    cycles,
    (cycle) => cycle.runtimeChannel?.maxFirstAudioLatencyMs,
  );
  const maxRuntimeJitter = maxOf(
    cycles,
    (cycle) => cycle.runtimeChannel?.maxJitterMs,
  );
  const maxRuntimeInterruption = maxOf(
    cycles,
    (cycle) => cycle.runtimeChannel?.maxInterruptionP95Ms,
  );

  const rows = cycles
    .map(
      (cycle) =>
        `| ${cycle.cycle} | ${cycle.ok ? "pass" : "fail"} | ${cycle.productionReadiness?.status ?? "n/a"} | ${cycle.providerSlo?.status ?? "n/a"} | ${cycle.runtimeChannel?.status ?? "n/a"} | ${renderMs(cycle.turnLatency?.p95Ms)} | ${renderMs(cycle.liveLatency?.p95Ms)} | ${renderMs(cycle.runtimeChannel?.maxFirstAudioLatencyMs)} | ${renderMs(cycle.runtimeChannel?.maxJitterMs)} | ${cycle.opsRecovery?.issues ?? 0} |`,
    )
    .join("\n");
  const profileRows = profiles
    .map(
      (profile) =>
        `| ${profile.label} | ${profile.status} | ${renderMs(profile.maxProviderP95Ms)} | ${renderMs(profile.maxTurnP95Ms)} | ${renderMs(profile.maxLiveP95Ms)} | ${renderMs(profile.runtimeChannel?.maxFirstAudioLatencyMs)} |`,
    )
    .join("\n");

  return `# AbsoluteJS Voice Sustained Proof Trends

Generated: ${new Date().toISOString()}

Overall: **${ok ? "pass" : "fail"}**

Cycles: ${cycles.length}

Latest readiness: ${latest?.productionReadiness?.status ?? "n/a"}

Max turn p95: ${renderMs(maxTurnP95)}

Max live p95: ${renderMs(maxLiveP95)}

Max provider p95: ${renderMs(maxProviderP95)}

Best provider path: ${latest?.providers?.sort((left, right) => (left.p95Ms ?? Number.POSITIVE_INFINITY) - (right.p95Ms ?? Number.POSITIVE_INFINITY))[0]?.label ?? "n/a"}

Max runtime first audio: ${renderMs(maxRuntimeFirstAudio)}

Max runtime jitter: ${renderMs(maxRuntimeJitter)}

Max runtime interruption p95: ${renderMs(maxRuntimeInterruption)}

| Cycle | Status | Readiness | Provider SLO | Runtime channel | Turn p95 | Live p95 | First audio | Jitter | Ops issues |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
${rows}

## Benchmark profiles

| Profile | Status | Provider p95 | Turn p95 | Live p95 | First audio |
| --- | --- | ---: | ---: | ---: | ---: |
${profileRows}
`;
};

const readHistoricalProofTrendReports = async (): Promise<VoiceProofTrendReport[]> => {
  const entries = await readdir(outputRoot, { withFileTypes: true }).catch(() => []);
  const realCallProfileEntries = await readdir(realCallProfileRoot, {
    withFileTypes: true,
  }).catch(() => []);
  const paths = [
    join(outputRoot, "latest.json"),
    ...entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(outputRoot, entry.name, "proof-trends.json")),
    join(realCallProfileRoot, "latest.json"),
    ...realCallProfileEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(realCallProfileRoot, entry.name, "real-call-profiles.json")),
  ];
  const seen = new Set<string>();
  const reports: VoiceProofTrendReport[] = [];

  for (const path of paths) {
    const file = Bun.file(path);
    if (!(await file.exists())) {
      continue;
    }

    try {
      const parsed = (await file.json()) as Record<string, unknown>;
      if (parsed.ok === false) {
        continue;
      }
      const key =
        typeof parsed.runId === "string"
          ? parsed.runId
          : typeof parsed.outputDir === "string"
            ? parsed.outputDir
            : path;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      reports.push(
        buildVoiceProofTrendReport({
          ...(parsed as Parameters<typeof buildVoiceProofTrendReport>[0]),
          maxAgeMs: profileHistoryMaxAgeMs,
          source: path,
        }),
      );
    } catch {
      continue;
    }
  }

  return reports;
};

let server: ReturnType<typeof Bun.spawn> | undefined;
let exitCode = 0;

try {
  if (await isServerRunning()) {
    console.log(`Reusing running demo server at ${baseUrl}.`);
  } else {
    server = Bun.spawn(["bun", "run", "dev"], {
      env: {
        ...process.env,
        PORT: process.env.PORT ?? "3004",
      },
      stderr: "inherit",
      stdout: "inherit",
    });
  }

  await waitForServer(server);
  await mkdir(outputDir, { recursive: true });

  const trendCycles: TrendCycle[] = [];
  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    const result = await runCycle(cycle);
    trendCycles.push(result);
    console.log(
      `cycle ${cycle}/${cycles}: ${result.ok ? "pass" : "fail"} provider=${result.providerSlo?.status ?? "n/a"} turnP95=${renderMs(result.turnLatency?.p95Ms)} liveP95=${renderMs(result.liveLatency?.p95Ms)}`,
    );
    if (cycle < cycles && intervalMs > 0) {
      await sleep(intervalMs);
    }
  }

  const generatedAt = new Date().toISOString();
  const providers = summarizeProviders(trendCycles);
  const summary = {
    cycles: trendCycles.length,
    maxLiveP95Ms: maxOf(trendCycles, (cycle) => cycle.liveLatency?.p95Ms),
    maxProviderP95Ms: maxOf(trendCycles, (cycle) =>
      maxOf(cycle.providers ?? [], (provider) => provider.p95Ms),
    ),
    providers,
    runtimeChannel: {
      maxBackpressureEvents: maxOf(
        trendCycles,
        (cycle) => cycle.runtimeChannel?.maxBackpressureEvents,
      ),
      maxFirstAudioLatencyMs: maxOf(
        trendCycles,
        (cycle) => cycle.runtimeChannel?.maxFirstAudioLatencyMs,
      ),
      maxInterruptionP95Ms: maxOf(
        trendCycles,
        (cycle) => cycle.runtimeChannel?.maxInterruptionP95Ms,
      ),
      maxJitterMs: maxOf(trendCycles, (cycle) => cycle.runtimeChannel?.maxJitterMs),
      maxTimestampDriftMs: maxOf(
        trendCycles,
        (cycle) => cycle.runtimeChannel?.maxTimestampDriftMs,
      ),
      samples: maxOf(trendCycles, (cycle) => cycle.runtimeChannel?.samples),
      status: trendCycles.every((cycle) => cycle.runtimeChannel?.status === "pass")
        ? "pass"
        : "warn",
    },
    maxTurnP95Ms: maxOf(trendCycles, (cycle) => cycle.turnLatency?.p95Ms),
  };
  const currentReport = buildVoiceProofTrendReport({
    baseUrl,
    cycles: trendCycles,
    generatedAt,
    maxAgeMs: profileHistoryMaxAgeMs,
    ok: trendCycles.every((cycle) => cycle.ok),
    outputDir,
    runId,
    summary,
  });
  const profiles = buildVoiceProofTrendProfileSummaries([
    ...(await readHistoricalProofTrendReports()),
    currentReport,
  ]);
  const output = {
    baseUrl,
    cycles: trendCycles,
    generatedAt,
    ok: trendCycles.every((cycle) => cycle.ok),
    outputDir,
    runId,
    summary: {
      ...summary,
      profiles,
    },
  };

  await writeFile(
    join(outputDir, "proof-trends.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
  await writeFile(
    join(outputDir, "proof-trends.md"),
    renderMarkdown(trendCycles, profiles),
  );
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    join(outputRoot, "latest.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
  await writeFile(join(outputRoot, "latest.md"), renderMarkdown(trendCycles, profiles));

  if (!output.ok) {
    exitCode = 1;
  }

  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  if (server) {
    server.kill();
    await Promise.race([server.exited, sleep(2_000)]);
  }
}

process.exit(exitCode);
