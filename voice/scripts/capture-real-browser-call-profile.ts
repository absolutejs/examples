export {};

import { buildVoiceBrowserCallProfileReport } from "@absolutejs/voice";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type ChromeTarget = {
  id: string;
  webSocketDebuggerUrl: string;
};

type Pending = {
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
};

type ChromeSession = {
  close: () => Promise<void>;
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  target: ChromeTarget;
};

type ManagedProcess = {
  hasExited: () => boolean;
  stop: () => void;
};

type JsonRecord = Record<string, unknown>;
type FrameworkId = "react" | "vue" | "svelte" | "angular" | "html" | "htmx";

const appOrigin = (
  process.env.VOICE_DEMO_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3004"}`
).replace(/\/$/, "");
const chromeDebuggingPort =
  process.env.VOICE_BROWSER_CALL_CHROME_PORT ?? "9224";
const browserHost =
  process.env.VOICE_BROWSER_CALL_BROWSER_HOST ??
  `http://127.0.0.1:${chromeDebuggingPort}`;
const defaultFrameworks: FrameworkId[] = [
  "react",
  "vue",
  "svelte",
  "angular",
  "html",
  "htmx",
];
const frameworks = (
  process.env.VOICE_BROWSER_CALL_FRAMEWORKS ??
  process.env.VOICE_BROWSER_CALL_FRAMEWORK ??
  "all"
)
  .split(",")
  .flatMap((value) => {
    const normalized = value.trim().toLowerCase();
    return normalized === "all" || normalized === "*"
      ? defaultFrameworks
      : [normalized];
  })
  .filter((value, index, values): value is FrameworkId => {
    const valid = defaultFrameworks.includes(value as FrameworkId);
    return valid && values.indexOf(value) === index;
  });
const profileId =
  process.env.VOICE_BROWSER_CALL_PROFILE_ID ?? "meeting-recorder";
const durationMs = Math.max(
  1_000,
  Number(process.env.VOICE_BROWSER_CALL_DURATION_MS ?? 1_500),
);
const concurrency = Math.max(
  1,
  Number(process.env.VOICE_BROWSER_CALL_CONCURRENCY ?? 2),
);
const maxRetries = Math.max(
  0,
  Number(process.env.VOICE_BROWSER_CALL_RETRIES ?? 2),
);
const outputRoot =
  process.env.VOICE_BROWSER_CALL_PROFILE_OUTPUT_DIR ??
  ".voice-runtime/browser-call-profiles";
const runId = new Date().toISOString().replaceAll(":", "-");
const outputDir = join(outputRoot, runId);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const spawnProcess = (
  command: string[],
  env: Record<string, string> = {},
): ManagedProcess => {
  let exited = false;
  const proc = Bun.spawn(command, {
    env: {
      ...process.env,
      ...env,
    },
    stderr: "inherit",
    stdout: "inherit",
  });
  void proc.exited.then(() => {
    exited = true;
  });

  return {
    hasExited: () => exited,
    stop: () => {
      try {
        proc.kill();
      } catch {}
    },
  };
};

const waitForHTTP = async (
  url: string,
  timeoutMs: number,
  isAborted?: () => boolean,
) => {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    if (isAborted?.()) {
      throw new Error(`Stopped waiting for ${url}; backing process exited.`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await wait(250);
  }

  throw new Error(
    `Timed out waiting for ${url}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
};

const createChromeSession = async (url: string): Promise<ChromeSession> => {
  const targetResponse = await fetch(`${browserHost}/json/new?${url}`, {
    method: "PUT",
  });
  if (!targetResponse.ok) {
    throw new Error(`Failed to create Chrome target: ${targetResponse.status}`);
  }

  const target = (await targetResponse.json()) as ChromeTarget;
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map<number, Pending>();
  let commandId = 0;

  const send = (method: string, params: Record<string, unknown> = {}) => {
    const id = ++commandId;
    ws.send(JSON.stringify({ id, method, params }));

    return new Promise((resolve, reject) => {
      pending.set(id, { reject, resolve });
    });
  };

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (typeof message.id !== "number") {
      return;
    }

    const item = pending.get(message.id);
    if (!item) {
      return;
    }
    pending.delete(message.id);

    if (message.error) {
      item.reject(new Error(JSON.stringify(message.error)));
    } else {
      item.resolve(message.result);
    }
  });

  await new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", () => reject(new Error("Chrome CDP failed")), {
      once: true,
    });
  });

  return {
    close: async () => {
      await fetch(`${browserHost}/json/close/${target.id}`).catch(() => {});
      ws.close();
    },
    send,
    target,
  };
};

const evaluate = async <T>(session: ChromeSession, expression: string) => {
  const result = (await session.send("Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  })) as {
    result: {
      value: T;
    };
  };

  return result.result.value;
};

const installBrowserCaptureTracker = `(() => {
  const NativeWebSocket = window.WebSocket;
  const stats = [];

  const sizeOf = (value) => {
    if (typeof value === 'string') return value.length;
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (ArrayBuffer.isView(value)) return value.byteLength;
    if (value instanceof Blob) return value.size;
    return 0;
  };

  function TrackedWebSocket(url, protocols) {
    const socket = protocols === undefined
      ? new NativeWebSocket(url)
      : new NativeWebSocket(url, protocols);
    const item = {
      binaryMessages: 0,
      closeCode: undefined,
      closedAt: undefined,
      messageCount: 0,
      openedAt: undefined,
      receivedBytes: 0,
      sentBytes: 0,
      url: String(url)
    };
    const nativeSend = socket.send.bind(socket);
    socket.send = (data) => {
      item.sentBytes += sizeOf(data);
      return nativeSend(data);
    };
    socket.addEventListener('open', () => {
      item.openedAt = Date.now();
    });
    socket.addEventListener('message', (event) => {
      item.messageCount += 1;
      item.receivedBytes += sizeOf(event.data);
      if (typeof event.data !== 'string') {
        item.binaryMessages += 1;
      }
    });
    socket.addEventListener('close', (event) => {
      item.closeCode = event.code;
      item.closedAt = Date.now();
    });
    stats.push(item);
    return socket;
  }

  Object.setPrototypeOf(TrackedWebSocket, NativeWebSocket);
  TrackedWebSocket.prototype = NativeWebSocket.prototype;
  window.__absoluteVoiceBrowserCallStats = stats;
  window.WebSocket = TrackedWebSocket;
})()`;

const captureExpression = `(() => {
  const read = (selector) => document.querySelector(selector)?.textContent?.trim() ?? '';
  const sockets = window.__absoluteVoiceBrowserCallStats ?? [];
  return {
    chatText: read('#chat-list'),
    lifecycle: read('#status-call-lifecycle'),
    microphone: read('#voice-monitor-copy'),
    reconnect: read('#status-reconnect'),
    status: read('#status-voice'),
    sockets
  };
})()`;

const clickExpression = (selector: string) => `(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  element.click();
  return true;
})()`;

const clickButtonByTextExpression = (text: string) => `(() => {
  const expected = ${JSON.stringify(text)}.toLowerCase();
  for (const button of document.querySelectorAll('button')) {
    const label = button.textContent?.trim().toLowerCase() ?? '';
    if (label.includes(expected)) {
      button.click();
      return true;
    }
  }
  return false;
})()`;

const clickGeneralStartExpression = `(() => {
  const direct = document.querySelector('#start-general');
  if (direct instanceof HTMLElement) {
    direct.click();
    return true;
  }
  for (const button of document.querySelectorAll('button')) {
    const label = button.textContent?.trim().toLowerCase() ?? '';
    if (label.includes('general')) {
      button.click();
      return true;
    }
  }
  return false;
})()`;

const waitFor = async <T>(
  read: () => Promise<T>,
  accept: (value: T) => boolean,
  timeoutMs: number,
) => {
  const startedAt = Date.now();
  let latest: T | undefined;
  while (Date.now() - startedAt < timeoutMs) {
    latest = await read();
    if (accept(latest)) {
      return latest;
    }
    await wait(100);
  }
  throw new Error(
    `Timed out waiting for browser capture condition. Latest: ${JSON.stringify(latest)}`,
  );
};

const mapConcurrent = async <Input, Output>(
  values: Input[],
  limit: number,
  runItem: (value: Input) => Promise<Output>,
) => {
  const results = new Array<Output>(values.length);
  let nextIndex = 0;
  const workerCount = Math.min(limit, values.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex++;
        const value = values[index];
        if (value === undefined) {
          continue;
        }
        results[index] = await runItem(value);
      }
    }),
  );

  return results.filter((result): result is Output => result !== undefined);
};

const summarizeSockets = (sockets: unknown[]) => {
  const voiceSockets = sockets.filter(
    (socket): socket is JsonRecord =>
      isRecord(socket) &&
      typeof socket.url === "string" &&
      socket.url.includes("/voice/"),
  );
  const sentBytes = voiceSockets.reduce(
    (total, socket) => total + (readNumber(socket.sentBytes) ?? 0),
    0,
  );
  const receivedBytes = voiceSockets.reduce(
    (total, socket) => total + (readNumber(socket.receivedBytes) ?? 0),
    0,
  );
  const messageCount = voiceSockets.reduce(
    (total, socket) => total + (readNumber(socket.messageCount) ?? 0),
    0,
  );

  return {
    messageCount,
    openSockets: voiceSockets.filter(
      (socket) => readNumber(socket.openedAt) !== undefined,
    ).length,
    receivedBytes,
    sentBytes,
    sockets: voiceSockets,
  };
};

const captureFramework = async (framework: FrameworkId) => {
  const url = `${appOrigin}/${framework}?engine=openai-realtime&provider=openai&routing=fastest&voiceProfile=${encodeURIComponent(profileId)}`;
  const session = await createChromeSession(url);
  try {
    await session.send("Runtime.enable");
    await session.send("Page.enable");
    await session.send("Page.addScriptToEvaluateOnNewDocument", {
      source: installBrowserCaptureTracker,
    });
    await session.send("Page.navigate", { url });
    await wait(framework === "angular" ? 5_000 : 3_500);

    const clicked = await waitFor(
      () => evaluate<boolean>(session, clickGeneralStartExpression),
      (value) => value,
      8_000,
    );
    if (!clicked) {
      throw new Error(`Could not click #start-general on ${url}`);
    }

    await waitFor(
      () => evaluate<JsonRecord>(session, captureExpression),
      (capture) => {
        const sockets = Array.isArray(capture.sockets) ? capture.sockets : [];
        const summary = summarizeSockets(sockets);
        return summary.openSockets > 0 && summary.sentBytes > 0;
      },
      8_000,
    );
    await wait(durationMs);
    await evaluate<boolean>(session, clickExpression("#stop-mic")).catch(
      async () =>
        await evaluate<boolean>(
          session,
          clickButtonByTextExpression("stop microphone"),
        ),
    );
    await wait(500);

    const capture = await evaluate<JsonRecord>(session, captureExpression);
    const sockets = Array.isArray(capture.sockets) ? capture.sockets : [];
    const socketSummary = summarizeSockets(sockets);

    return {
      framework,
      ok: socketSummary.openSockets > 0 && socketSummary.sentBytes > 0,
      summary: {
        ...socketSummary,
        lifecycle: capture.lifecycle,
        microphone: capture.microphone,
        reconnect: capture.reconnect,
        status: capture.status,
      },
      url,
    };
  } finally {
    await session.close();
  }
};

const run = async () => {
  if (frameworks.length === 0) {
    throw new Error("No valid VOICE_BROWSER_CALL_FRAMEWORKS were provided.");
  }

  const startedServer =
    process.env.VOICE_BROWSER_CALL_USE_EXISTING_SERVER === "1"
      ? null
      : spawnProcess(["bun", "run", "dev"], {
          PORT: process.env.PORT ?? "3004",
        });
  const startedChrome =
    process.env.VOICE_BROWSER_CALL_USE_EXISTING_CHROME === "1"
      ? null
      : spawnProcess([
          "google-chrome",
          "--headless=new",
          `--remote-debugging-port=${chromeDebuggingPort}`,
          "--disable-gpu",
          "--no-sandbox",
          `--user-data-dir=${join(outputDir, "chrome")}`,
          "--use-fake-device-for-media-stream",
          "--use-fake-ui-for-media-stream",
          "about:blank",
        ]);

  try {
    await waitForHTTP(
      appOrigin,
      30_000,
      () => startedServer?.hasExited() ?? false,
    );
    await waitForHTTP(
      `${browserHost}/json/version`,
      30_000,
      () => startedChrome?.hasExited() ?? false,
    );

    const captureWithFailureResult = async (framework: FrameworkId) => {
      let latestFailure: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        try {
          return await captureFramework(framework);
        } catch (error) {
          latestFailure = error;
          if (attempt < maxRetries) {
            await wait(1_000);
          }
        }
      }

      const error = latestFailure;
      return {
        error: error instanceof Error ? error.message : String(error),
        framework,
        ok: false,
        summary: {
          messageCount: 0,
          openSockets: 0,
          receivedBytes: 0,
          sentBytes: 0,
          sockets: [],
        },
        url: `${appOrigin}/${framework}?engine=openai-realtime&provider=openai&routing=fastest`,
      };
    };
    const captureOnceWithFailureResult = async (framework: FrameworkId) => {
      try {
        return await captureFramework(framework);
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          framework,
          ok: false,
          summary: {
            messageCount: 0,
            openSockets: 0,
            receivedBytes: 0,
            sentBytes: 0,
            sockets: [],
          },
          url: `${appOrigin}/${framework}?engine=openai-realtime&provider=openai&routing=fastest`,
        };
      }
    };
    const results = await mapConcurrent(
      frameworks,
      concurrency,
      captureOnceWithFailureResult,
    );
    for (const [index, result] of results.entries()) {
      if (result.ok) {
        continue;
      }

      await wait(1_000);
      results[index] = await captureWithFailureResult(result.framework);
    }

    const generatedAt = new Date().toISOString();
    const report = buildVoiceBrowserCallProfileReport({
      baseUrl: appOrigin,
      frameworks,
      generatedAt,
      outputDir,
      profileId,
      results,
      runId,
      source: "browser-cdp-fake-microphone",
      summary: {
        failedFrameworks: results
          .filter((result) => !result.ok)
          .map((result) => result.framework),
        messageCount: results.reduce(
          (total, result) =>
            total + (readNumber(result.summary.messageCount) ?? 0),
          0,
        ),
        openSockets: results.reduce(
          (total, result) =>
            total + (readNumber(result.summary.openSockets) ?? 0),
          0,
        ),
        passedFrameworks: results
          .filter((result) => result.ok)
          .map((result) => result.framework),
        receivedBytes: results.reduce(
          (total, result) =>
            total + (readNumber(result.summary.receivedBytes) ?? 0),
          0,
        ),
        sentBytes: results.reduce(
          (total, result) =>
            total + (readNumber(result.summary.sentBytes) ?? 0),
          0,
        ),
        totalFrameworks: results.length,
      },
    });

    await mkdir(outputDir, { recursive: true });
    await mkdir(outputRoot, { recursive: true });
    await writeFile(
      join(outputDir, "browser-call-profile.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await writeFile(
      join(outputRoot, "latest.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(JSON.stringify(report, null, 2));

    if (!report.ok) {
      process.exitCode = 1;
    }
  } finally {
    startedChrome?.stop();
    startedServer?.stop();
  }
};

await run();
