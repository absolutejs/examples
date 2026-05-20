export {};

import { mkdir, rm } from "node:fs/promises";
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

type ScreenshotTarget = {
  file: string;
  name: string;
  path: string;
  requiredText?: string[];
  waitMs?: number;
};

const baseUrl = (
  process.env.VOICE_DEMO_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3004"}`
).replace(/\/$/, "");
const browserHost =
  process.env.VOICE_SCREENSHOT_BROWSER_HOST ?? "http://127.0.0.1:9224";
const chromeDebuggingPort =
  new URL(browserHost).port ||
  process.env.VOICE_SCREENSHOT_CHROME_PORT ||
  "9224";
const waitTimeoutMs = Number(
  process.env.VOICE_PROOF_SCREENSHOT_WAIT_MS ?? 30_000,
);
const pollMs = Number(process.env.VOICE_PROOF_SCREENSHOT_POLL_MS ?? 500);
const viewportWidth = Number(process.env.VOICE_PROOF_SCREENSHOT_WIDTH ?? 1440);
const viewportHeight = Number(
  process.env.VOICE_PROOF_SCREENSHOT_HEIGHT ?? 1200,
);
const outputRoot =
  process.env.VOICE_PROOF_PACK_OUTPUT_DIR ?? ".voice-runtime/proof-pack";
const proofRuntimeDir =
  process.env.VOICE_DEMO_RUNTIME_DIR ??
  join(outputRoot, "runtime", new Date().toISOString().replaceAll(":", "-"));
const latestScreenshotsDir = join(outputRoot, "screenshots", "latest");
const generatedObservabilityExportPaths = [
  ".voice-runtime/observability-export-receipts",
  ".voice-runtime/observability-exports",
];

const screenshotTargets: ScreenshotTarget[] = [
  {
    file: "production-readiness.png",
    name: "Production Readiness",
    path: "/production-readiness",
  },
  {
    file: "framework-readiness-gates.png",
    name: "Framework Readiness Gate Explanations",
    path: "/htmx",
    requiredText: [
      "Readiness Gate Explanations",
      "production readiness JSON",
      "Gate thresholds",
    ],
    waitMs: 1_000,
  },
  {
    file: "provider-slos.png",
    name: "Provider SLOs",
    path: "/voice/provider-slos",
  },
  {
    file: "provider-orchestration.png",
    name: "Provider Orchestration",
    path: "/voice/provider-orchestration",
    requiredText: ["Provider Policy Proof", "live-call"],
  },
  {
    file: "provider-decisions.png",
    name: "Provider Decisions",
    path: "/voice/provider-decisions",
    requiredText: ["Provider Decision Traces", "Runtime proof"],
  },
  {
    file: "competitive-coverage.png",
    name: "Competitive Coverage",
    path: "/voice/competitive-coverage",
    requiredText: [
      "AbsoluteJS Voice Competitive Coverage",
      "Self-hosted market proof",
      "Provider choice and fallback",
    ],
  },
  {
    file: "realtime-channel.png",
    name: "Realtime Channel",
    path: "/voice/realtime-channel",
    requiredText: [
      "AbsoluteJS Voice Realtime Channel Proof",
      "Realtime / duplex readiness",
      "openai-realtime",
      "Runtime Samples",
    ],
  },
  {
    file: "realtime-provider-contracts.png",
    name: "Realtime Provider Contracts",
    path: "/voice/realtime-provider-contracts",
    requiredText: [
      "AbsoluteJS Voice Realtime Provider Contracts",
      "Realtime provider contracts",
      "openai-realtime",
      "gemini-live",
      "Trace evidence",
    ],
  },
  {
    file: "proof-trends.png",
    name: "Sustained Proof Trends",
    path: "/voice/proof-trends",
  },
  {
    file: "simulation-suite.png",
    name: "Simulation Suite",
    path: "/voice/simulations",
  },
  {
    file: "operations-record.png",
    name: "Operations Record",
    path: "/voice-operations/demo-incident-bundle",
    requiredText: [
      "assistant.guardrail",
      "assistant-output",
      "tool-input",
      "operations-record-guardrail-seed",
    ],
  },
  {
    file: "post-call-analysis.png",
    name: "Post-Call Analysis",
    path: "/voice/post-call-analysis",
  },
  {
    file: "guardrails.png",
    name: "Guardrails",
    path: "/voice/guardrails",
    requiredText: [
      "Live runtime guardrail proof",
      "PASS",
      "tool-input",
      "assistant-output",
    ],
  },
  {
    file: "switching-from-vapi.png",
    name: "Switching From Vapi",
    path: "/switching-from-vapi",
    requiredText: ["liveGuardrailsRuntime", "Guardrails / policies"],
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const spawnProcess = (command: string[], env: Record<string, string> = {}) => {
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
    proc,
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

    await sleep(pollMs);
  }

  throw new Error(
    `Timed out waiting for ${url}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
};

const isServerRunning = async () => {
  try {
    await waitForHTTP(`${baseUrl}/api/production-readiness`, 1_500);
    return true;
  } catch {
    return false;
  }
};

const isChromeRunning = async () => {
  try {
    await waitForHTTP(`${browserHost}/json/version`, 1_500);
    return true;
  } catch {
    return false;
  }
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

const waitForReadyState = async (session: ChromeSession) => {
  const startedAt = Date.now();
  let latest = "";

  while (Date.now() - startedAt < waitTimeoutMs) {
    latest = await evaluate<string>(session, "document.readyState");
    if (latest === "complete") {
      return;
    }
    await sleep(100);
  }

  throw new Error(
    `Timed out waiting for document readiness. Latest: ${latest}`,
  );
};

const waitForRequiredText = async (
  session: ChromeSession,
  target: ScreenshotTarget,
) => {
  if (!target.requiredText?.length) {
    return [];
  }

  const startedAt = Date.now();
  let bodyText = "";

  while (Date.now() - startedAt < waitTimeoutMs) {
    bodyText = await evaluate<string>(
      session,
      "document.body?.innerText ?? ''",
    );
    const normalizedBodyText = bodyText.toLowerCase();
    const missing = target.requiredText.filter(
      (text) => !normalizedBodyText.includes(text.toLowerCase()),
    );
    if (missing.length === 0) {
      return target.requiredText;
    }
    await sleep(pollMs);
  }

  const normalizedBodyText = bodyText.toLowerCase();
  const missing = target.requiredText.filter(
    (text) => !normalizedBodyText.includes(text.toLowerCase()),
  );
  throw new Error(
    `${target.name} screenshot is missing required text: ${missing.join(", ")}`,
  );
};

const captureTarget = async (
  target: ScreenshotTarget,
  screenshotsDir: string,
) => {
  const url = `${baseUrl}${target.path}`;
  const session = await createChromeSession(url);

  try {
    await session.send("Page.enable");
    await session.send("Runtime.enable");
    await session.send("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height: viewportHeight,
      mobile: false,
      width: viewportWidth,
    });
    await session.send("Page.navigate", { url });
    await waitForReadyState(session);
    await sleep(target.waitMs ?? 700);
    const requiredText = await waitForRequiredText(session, target);

    const metrics = (await session.send("Page.getLayoutMetrics")) as {
      cssContentSize?: {
        height: number;
        width: number;
        x: number;
        y: number;
      };
    };
    const contentSize = metrics.cssContentSize ?? {
      height: viewportHeight,
      width: viewportWidth,
      x: 0,
      y: 0,
    };
    const image = (await session.send("Page.captureScreenshot", {
      captureBeyondViewport: true,
      clip: {
        height: Math.max(viewportHeight, Math.ceil(contentSize.height)),
        scale: 1,
        width: Math.max(viewportWidth, Math.ceil(contentSize.width)),
        x: 0,
        y: 0,
      },
      format: "png",
      fromSurface: true,
    })) as { data: string };

    const bytes = Buffer.from(image.data, "base64");
    const path = join(screenshotsDir, target.file);
    await Bun.write(path, bytes);

    return {
      bytes: bytes.length,
      file: target.file,
      name: target.name,
      path: target.path,
      requiredText,
      url,
    };
  } finally {
    await session.close();
  }
};

const mirrorScreenshots = async (
  screenshots: Awaited<ReturnType<typeof captureTarget>>[],
  fromDir: string,
  toDir: string,
) => {
  await mkdir(toDir, { recursive: true });
  for (const screenshot of screenshots) {
    await Bun.write(
      join(toDir, screenshot.file),
      await Bun.file(join(fromDir, screenshot.file)).arrayBuffer(),
    );
  }
};

const runProofPack = async () => {
  const proofPack = Bun.spawn(["bun", "run", "proof:pack"], {
    env: {
      ...process.env,
      PORT: process.env.PORT ?? "3004",
      VOICE_DEMO_URL: baseUrl,
    },
    stderr: "inherit",
    stdout: "inherit",
  });
  const exitCode = await proofPack.exited;
  if (exitCode !== 0) {
    throw new Error(`proof:pack exited with code ${exitCode}`);
  }
};

const readLatestProofPack = async () => {
  const latestPath = join(outputRoot, "latest.json");
  const latest = (await Bun.file(latestPath).json()) as {
    outputDir?: string;
    runId?: string;
  };
  if (!latest.outputDir || !latest.runId) {
    throw new Error(`${latestPath} does not include outputDir and runId.`);
  }
  return {
    outputDir: latest.outputDir,
    runId: latest.runId,
  };
};

const appendScreenshotIndex = async (
  outputDir: string,
  screenshots: Awaited<ReturnType<typeof captureTarget>>[],
) => {
  const section = `## Screenshot Proof

${screenshots
  .map(
    (screenshot) =>
      `- ${screenshot.name}: \`screenshots/${screenshot.file}\` (${screenshot.bytes} bytes)`,
  )
  .join("\n")}

`;
  const proofPackPath = join(outputDir, "proof-pack.md");
  const latestMarkdownPath = join(outputRoot, "latest.md");
  const proofPackMarkdown = await Bun.file(proofPackPath).text();
  const nextMarkdown = `${proofPackMarkdown.trimEnd()}\n\n${section}`;
  await Bun.write(proofPackPath, nextMarkdown);
  await Bun.write(latestMarkdownPath, nextMarkdown);
};

const cleanGeneratedObservabilityExports = async () => {
  await Promise.all(
    generatedObservabilityExportPaths.map((path) =>
      rm(path, { force: true, recursive: true }),
    ),
  );
};

let server: ReturnType<typeof spawnProcess> | undefined;
let chrome: ReturnType<typeof spawnProcess> | undefined;

try {
  await cleanGeneratedObservabilityExports();

  if (await isServerRunning()) {
    console.log(`Reusing running demo server at ${baseUrl}.`);
  } else {
    server = spawnProcess(["bun", "run", "dev"], {
      PORT: process.env.PORT ?? "3004",
      VOICE_DEMO_RUNTIME_DIR: proofRuntimeDir,
    });
  }

  if (await isChromeRunning()) {
    console.log(`Reusing running headless Chrome at ${browserHost}.`);
  } else {
    chrome = spawnProcess([
      "google-chrome",
      "--headless=new",
      `--remote-debugging-port=${chromeDebuggingPort}`,
      "--disable-gpu",
      "--no-sandbox",
      "about:blank",
    ]);
  }

  await waitForHTTP(
    `${baseUrl}/api/production-readiness`,
    waitTimeoutMs,
    () => server?.hasExited() ?? false,
  );
  await waitForHTTP(
    `${browserHost}/json/version`,
    waitTimeoutMs,
    () => chrome?.hasExited() ?? false,
  );

  await runProofPack();
  const latest = await readLatestProofPack();
  await mkdir(latestScreenshotsDir, { recursive: true });
  const screenshots = await Promise.all(
    screenshotTargets.map((target) => captureTarget(target, latestScreenshotsDir)),
  );

  await Bun.write(
    join(latestScreenshotsDir, "manifest.json"),
    `${JSON.stringify(
      {
        baseUrl,
        generatedAt: new Date().toISOString(),
        runId: latest.runId,
        screenshots,
      },
      null,
      2,
    )}\n`,
  );

  const finalScreenshotsDir = join(latest.outputDir, "screenshots");
  await mirrorScreenshots(screenshots, latestScreenshotsDir, finalScreenshotsDir);
  await Bun.write(
    join(finalScreenshotsDir, "manifest.json"),
    `${JSON.stringify(
      {
        baseUrl,
        generatedAt: new Date().toISOString(),
        runId: latest.runId,
        screenshots,
      },
      null,
      2,
    )}\n`,
  );
  await appendScreenshotIndex(latest.outputDir, screenshots);

  console.log(
    JSON.stringify(
      {
        ok: true,
        outputDir: latest.outputDir,
        screenshots,
      },
      null,
      2,
    ),
  );
} finally {
  chrome?.stop();
  server?.stop();
}
