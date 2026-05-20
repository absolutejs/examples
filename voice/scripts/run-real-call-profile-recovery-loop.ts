import { runVoiceRealCallProfileRecoveryLoop } from "@absolutejs/voice";

const baseUrl = (
  process.env.VOICE_DEMO_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3004"}`
).replace(/\/$/, "");
const port = process.env.PORT ?? "3004";
const waitTimeoutMs = Number(
  process.env.VOICE_RECOVERY_LOOP_SERVER_WAIT_MS ?? 30_000,
);
const serverPollMs = Number(
  process.env.VOICE_RECOVERY_LOOP_SERVER_POLL_MS ?? 500,
);
const requestTimeoutMs = Number(
  process.env.VOICE_RECOVERY_LOOP_REQUEST_TIMEOUT_MS ?? 5_000,
);
const useExistingServer =
  process.env.VOICE_RECOVERY_LOOP_USE_EXISTING_SERVER === "1";
const runtimeDir =
  process.env.VOICE_DEMO_RUNTIME_DIR ??
  `.voice-runtime/recovery-loop/runtime/${new Date()
    .toISOString()
    .replaceAll(":", "-")}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async <Value>(href: string): Promise<Value> => {
  const response = await fetch(new URL(href, baseUrl), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`${href} returned HTTP ${response.status}.`);
  }

  return response.json() as Promise<Value>;
};

const pingServer = async () => {
  await fetchJson<unknown>("/api/production-readiness");
};

const isServerRunning = async () => {
  try {
    await pingServer();
    return true;
  } catch {
    return false;
  }
};

const startServer = (): ReturnType<typeof Bun.spawn> =>
  Bun.spawn(["bun", "run", "dev"], {
    env: {
      ...process.env,
      PORT: port,
      VOICE_DEMO_RUNTIME_DIR: runtimeDir,
      VOICE_REAL_CALL_PROFILES_ROOT: `${runtimeDir}/real-call-profiles`,
    },
    stderr: "inherit",
    stdout: "inherit",
  });

const waitForServer = async (server?: ReturnType<typeof Bun.spawn>) => {
  const deadline = Date.now() + waitTimeoutMs;
  let lastError = "Server did not respond.";
  let serverExitCode: number | undefined;
  let serverExited = false;

  if (server) {
    void server.exited.then((exitCode) => {
      serverExitCode = exitCode;
      serverExited = true;
    });
  }

  while (Date.now() < deadline) {
    if (serverExited) {
      throw new Error(
        `Dev server exited with code ${serverExitCode ?? "unknown"} before recovery loop could run: ${lastError}`,
      );
    }

    try {
      await pingServer();
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await Promise.race([
      sleep(serverPollMs),
      server?.exited.then((exitCode) => {
        serverExitCode = exitCode;
        serverExited = true;
      }),
    ]);
  }

  throw new Error(
    `Timed out waiting ${waitTimeoutMs}ms for ${baseUrl}: ${lastError}`,
  );
};

const stopServer = async (server: ReturnType<typeof Bun.spawn> | undefined) => {
  if (!server) {
    return;
  }

  server.kill();
  await Promise.race([server.exited, sleep(2_000)]);
};

let server: ReturnType<typeof Bun.spawn> | undefined;
let exitCode = 0;

try {
  if (await isServerRunning()) {
    console.log(`Reusing running demo server at ${baseUrl}.`);
  } else if (useExistingServer) {
    throw new Error(`No running demo server found at ${baseUrl}.`);
  } else {
    console.log(`Starting demo server at ${baseUrl}.`);
    server = startServer();
    await waitForServer(server);
  }

  const report = await runVoiceRealCallProfileRecoveryLoop({
    baseUrl,
    logger: console,
    requestTimeoutMs,
  });

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    exitCode = 1;
  }
} catch (error) {
  exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  await stopServer(server);
}

process.exit(exitCode);
