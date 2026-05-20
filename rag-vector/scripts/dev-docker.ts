import { $ } from "bun";
import { Socket } from "node:net";

const postgresUrl =
  process.env.RAG_POSTGRES_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55433/absolute_rag_demo";
const readinessTimeoutMs = 30_000;
const readinessIntervalMs = 500;

let child: ReturnType<typeof Bun.spawn> | null = null;
let cleaningUp = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parsePostgresSocket = (connectionString: string) => {
  const url = new URL(connectionString);
  const hostname = url.hostname || "127.0.0.1";
  const port = Number.parseInt(url.port || "5432", 10);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PostgreSQL port in RAG_POSTGRES_URL: ${url.port}`);
  }

  return { hostname, port };
};

const waitForSocket = async (
  hostname: string,
  port: number,
  timeoutMs: number,
) => {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = new Socket();
        let settled = false;

        const finish = (callback: () => void) => {
          if (settled) {
            return;
          }

          settled = true;
          socket.removeAllListeners();
          socket.destroy();
          callback();
        };

        socket.setTimeout(1_500);
        socket.once("connect", () => finish(resolve));
        socket.once("timeout", () =>
          finish(() =>
            reject(new Error("Timed out waiting for PostgreSQL socket")),
          ),
        );
        socket.once("error", (error) => finish(() => reject(error)));
        socket.connect(port, hostname);
      });

      return;
    } catch (error) {
      lastError = error;
      await sleep(readinessIntervalMs);
    }
  }

  const reason =
    lastError instanceof Error
      ? lastError.message
      : String(lastError ?? "unknown error");
  throw new Error(
    `PostgreSQL did not become ready at ${hostname}:${port} within ${timeoutMs}ms (${reason})`,
  );
};

const stopPostgres = async () => {
  if (cleaningUp) {
    return;
  }

  cleaningUp = true;

  try {
    await $`bun run pg:stop`.quiet();
  } catch {
    // pg:stop is intentionally idempotent; cleanup should not fail the runner.
  }
};

const cleanupAndExit = async (code: number) => {
  await stopPostgres();
  process.exit(code);
};

const forwardSignal = (signal: NodeJS.Signals) => {
  if (child !== null && child.exitCode === null) {
    child.kill(signal);
    return;
  }

  void cleanupAndExit(0);
};

process.on("SIGINT", () => {
  forwardSignal("SIGINT");
});

process.on("SIGTERM", () => {
  forwardSignal("SIGTERM");
});

try {
  await $`bun run pg:start`;

  const { hostname, port } = parsePostgresSocket(postgresUrl);
  await waitForSocket(hostname, port, readinessTimeoutMs);

  child = Bun.spawn(["absolute", "dev"], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      RAG_POSTGRES_URL: postgresUrl,
    },
  });

  const exitCode = await child.exited;
  await cleanupAndExit(exitCode);
} catch (error) {
  await stopPostgres();
  throw error;
}
