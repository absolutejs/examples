export {};

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type JsonRecord = Record<string, unknown>;

const port = process.env.PORT ?? process.env.VOICE_LONG_PROOF_PORT ?? "3004";
const baseUrl = (process.env.VOICE_DEMO_URL ?? `http://127.0.0.1:${port}`).replace(
  /\/$/,
  "",
);
const waitTimeoutMs = Number(
  process.env.VOICE_LONG_PROOF_SERVER_WAIT_MS ??
    process.env.VOICE_PROOF_PACK_SERVER_WAIT_MS ??
    30_000,
);
const pollMs = Number(
  process.env.VOICE_LONG_PROOF_SERVER_POLL_MS ??
    process.env.VOICE_PROOF_PACK_SERVER_POLL_MS ??
    500,
);
const cycles = Math.max(
  1,
  Number(process.env.VOICE_LONG_PROOF_TREND_CYCLES ?? 18),
);
const intervalMs = Math.max(
  0,
  Number(process.env.VOICE_LONG_PROOF_TREND_INTERVAL_MS ?? 1_000),
);
const samplesPerCycle = Math.max(
  1,
  Number(process.env.VOICE_LONG_PROOF_LIVE_SAMPLES_PER_CYCLE ?? 50),
);
const outputRoot =
  process.env.VOICE_LONG_PROOF_OUTPUT_DIR ?? ".voice-runtime/long-proof-window";
const runId = new Date().toISOString().replaceAll(":", "-");
const outputDir = join(outputRoot, runId);
const runtimeDir =
  process.env.VOICE_DEMO_RUNTIME_DIR ?? join(outputDir, "runtime");
const startedAtMs = Date.now();
const startedAt = new Date(startedAtMs).toISOString();
const reuseExistingServer =
  process.env.VOICE_LONG_PROOF_REUSE_SERVER === "true" ||
  process.env.VOICE_DEMO_URL !== undefined;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJsonFile = async (path: string): Promise<JsonRecord> => {
  const body = await Bun.file(path).json();
  return isRecord(body) ? body : {};
};

const readGeneratedAtMs = (artifact: JsonRecord) => {
  const value = artifact.generatedAt;
  return typeof value === "string" ? Date.parse(value) : undefined;
};

const assertFreshArtifact = (name: string, artifact: JsonRecord) => {
  const generatedAtMs = readGeneratedAtMs(artifact);
  if (!generatedAtMs || generatedAtMs < startedAtMs) {
    throw new Error(
      `${name} artifact is stale or missing generatedAt. Refusing to summarize old proof output.`,
    );
  }
};

const fetchJson = async (path: string) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  const body = await response.json();
  return isRecord(body) ? body : {};
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
        `Dev server exited before long proof could run with code ${
          serverExitCode ?? "unknown"
        }: ${lastError}`,
      );
    }

    try {
      await fetchJson("/api/production-readiness");
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

  throw new Error(`Timed out waiting ${waitTimeoutMs}ms for ${baseUrl}: ${lastError}`);
};

const isServerRunning = async () => {
  try {
    await fetchJson("/api/production-readiness");
    return true;
  } catch {
    return false;
  }
};

const runScript = async (
  script: string,
  env: Record<string, string> = {},
) => {
  const child = Bun.spawn(["bun", "run", script], {
    env: {
      ...process.env,
      PORT: process.env.PORT ?? "3004",
      VOICE_DEMO_URL: baseUrl,
      VOICE_DEMO_RUNTIME_DIR: runtimeDir,
      ...env,
    },
    stderr: "inherit",
    stdout: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`${script} exited with code ${exitCode}`);
  }
};

const finiteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const percentile = (values: number[], rank: number) => {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((rank / 100) * sorted.length) - 1),
  );
  return sorted[index];
};

const proofResultElapsedP95 = (
  proofPack: JsonRecord,
  names: readonly string[],
) => {
  const proofResults = Array.isArray(proofPack.proofResults)
    ? proofPack.proofResults
    : [];
  const values = proofResults
    .filter(
      (result): result is JsonRecord =>
        isRecord(result) &&
        typeof result.name === "string" &&
        names.includes(result.name),
    )
    .map((result) => result.elapsedMs)
    .filter(finiteNumber);

  return percentile(values, 95);
};

const collectRuntimeCalibration = async (proofPack: JsonRecord) => {
  const [bargeIn, reconnect] = await Promise.all([
    fetchJson("/api/voice-barge-in").catch((): JsonRecord => ({})),
    fetchJson("/api/voice/reconnect-contract").catch((): JsonRecord => ({})),
  ]);
  const bargeInEvents = Array.isArray(bargeIn.events) ? bargeIn.events : [];
  const interruptionP95Ms = percentile(
    bargeInEvents
      .map((event: unknown) =>
        isRecord(event) ? event.latencyMs : undefined,
      )
      .filter(finiteNumber),
    95,
  );
  const reconnectP95Ms =
    reconnect.resumeLatencyP95Ms ??
    reconnect.resumeLatencyMs ??
    proofResultElapsedP95(proofPack, ["reconnectContract"]);
  const monitorRunP95Ms = proofResultElapsedP95(proofPack, [
    "productionReadiness",
    "opsRecovery",
    "providerSlo",
    "proofTrends",
  ]);
  const notifierDeliveryP95Ms = proofResultElapsedP95(proofPack, [
    "observabilityExportDelivery",
    "observabilityExportDeliverySeed",
  ]);

  return {
    interruptionP95Ms,
    monitorRunP95Ms,
    notifierDeliveryP95Ms,
    reconnectP95Ms: finiteNumber(reconnectP95Ms) ? reconnectP95Ms : undefined,
    sources: {
      interruption: "/api/voice-barge-in",
      monitorRun: "proof-pack elapsedMs for readiness/recovery/SLO/trends routes",
      notifierDelivery:
        "proof-pack elapsedMs for observability export delivery routes",
      reconnect: "/api/voice/reconnect-contract",
    },
  };
};

const renderMarkdown = (input: {
  ok: boolean;
  proofPack: JsonRecord;
  proofTrends: JsonRecord;
}) => {
  const trendSummary = isRecord(input.proofTrends.summary)
    ? input.proofTrends.summary
    : {};
  const proofSummary = isRecord(input.proofPack.summary)
    ? input.proofPack.summary
    : {};

  return `# AbsoluteJS Voice Long Proof Window

Generated: ${new Date().toISOString()}

Started: ${startedAt}

Overall: **${input.ok ? "pass" : "fail"}**

Trend cycles: ${String(trendSummary.cycles ?? "n/a")}

Max turn p95: ${String(trendSummary.maxTurnP95Ms ?? "n/a")}ms

Max live p95: ${String(trendSummary.maxLiveP95Ms ?? "n/a")}ms

Max provider p95: ${String(trendSummary.maxProviderP95Ms ?? "n/a")}ms

Proof pack status: ${input.proofPack.ok === true ? "pass" : "fail"}

Production readiness: ${String(proofSummary.productionReadinessStatus ?? "see latest.json")}

Artifacts:

- Proof trends: \`${String(input.proofTrends.outputDir ?? ".voice-runtime/proof-trends/latest.json")}\`
- Proof pack: \`${String(input.proofPack.outputDir ?? ".voice-runtime/proof-pack/latest.json")}\`
- Combined report: \`${outputDir}\`
`;
};

let server: ReturnType<typeof Bun.spawn> | undefined;
let exitCode = 0;

try {
  if (await isServerRunning()) {
    if (!reuseExistingServer) {
      throw new Error(
        `${baseUrl} is already serving. Long proof windows default to a fresh isolated runtime; stop the existing server or set VOICE_LONG_PROOF_REUSE_SERVER=true intentionally.`,
      );
    }
    console.log(`Reusing running demo server at ${baseUrl}.`);
  } else {
    server = Bun.spawn(["bun", "run", "dev"], {
      env: {
        ...process.env,
        PORT: port,
        VOICE_DEMO_RUNTIME_DIR: runtimeDir,
      },
      stderr: "inherit",
      stdout: "inherit",
    });
  }

  await waitForServer(server);
  await mkdir(outputDir, { recursive: true });

  await runScript("proof:trends", {
    VOICE_TREND_CYCLES: String(cycles),
    VOICE_TREND_INTERVAL_MS: String(intervalMs),
    VOICE_TREND_LIVE_SAMPLES_PER_CYCLE: String(samplesPerCycle),
  });
  await runScript("proof:pack", {
    VOICE_PROOF_PACK_REFRESH_TRENDS: "false",
  });

  const proofTrends = await readJsonFile(".voice-runtime/proof-trends/latest.json");
  const proofPack = await readJsonFile(".voice-runtime/proof-pack/latest.json");
  assertFreshArtifact("proof trends", proofTrends);
  assertFreshArtifact("proof pack", proofPack);
  const runtimeCalibration = await collectRuntimeCalibration(proofPack);

  const output = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    ok: proofTrends.ok === true && proofPack.ok === true,
    outputDir,
    proofPack: {
      generatedAt: proofPack.generatedAt,
      ok: proofPack.ok,
      outputDir: proofPack.outputDir,
      summary: proofPack.summary,
    },
    proofTrends: {
      generatedAt: proofTrends.generatedAt,
      ok: proofTrends.ok,
      outputDir: proofTrends.outputDir,
      summary: proofTrends.summary,
    },
    runId,
    runtimeCalibration,
    startedAt,
  };

  await writeFile(join(outputDir, "long-proof-window.json"), `${JSON.stringify(output, null, 2)}\n`);
  await writeFile(
    join(outputDir, "long-proof-window.md"),
    renderMarkdown({ ok: output.ok, proofPack, proofTrends }),
  );
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    join(outputRoot, "latest.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
  await writeFile(
    join(outputRoot, "latest.md"),
    renderMarkdown({ ok: output.ok, proofPack, proofTrends }),
  );

  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) {
    exitCode = 1;
  }
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
