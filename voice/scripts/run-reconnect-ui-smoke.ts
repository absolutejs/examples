type ChromeTarget = {
  id: string;
  webSocketDebuggerUrl: string;
};

export {};

type Pending = {
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
};

type ChromeSession = {
  close: () => Promise<void>;
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  target: ChromeTarget;
};

const appOrigin = process.env.VOICE_SMOKE_APP_ORIGIN ?? "http://127.0.0.1:3004";
const browserHost =
  process.env.VOICE_SMOKE_BROWSER_HOST ?? "http://127.0.0.1:9223";
const pages = ["react", "vue", "svelte", "angular", "html", "htmx"] as const;
const expected = {
  engine: "openai-realtime",
  provider: "openai",
  routing: "fastest",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const reconnectExpression = `(() => {
	const direct = document.querySelector('#status-reconnect');
	if (direct) return direct.textContent?.trim() ?? '';
	for (const row of document.querySelectorAll('.status-row')) {
		const label = row.querySelector('.label')?.textContent?.trim();
		if (label === 'Reconnect') {
			return row.querySelector('.value')?.textContent?.trim() ?? '';
		}
	}
	return '';
})()`;

const installWebSocketTrackerExpression = `(() => {
	const NativeWebSocket = window.WebSocket;
	const sockets = [];
	function TrackedWebSocket(url, protocols) {
		const socket = protocols === undefined
			? new NativeWebSocket(url)
			: new NativeWebSocket(url, protocols);
		sockets.push(socket);
		return socket;
	}
	Object.setPrototypeOf(TrackedWebSocket, NativeWebSocket);
	TrackedWebSocket.prototype = NativeWebSocket.prototype;
	window.__absoluteVoiceSmokeSockets = sockets;
	window.WebSocket = TrackedWebSocket;
})()`;

const simulateDisconnectExpression = `(() => {
	const hook = window.__absoluteVoiceDemoSimulateDisconnect;
	if (typeof hook === 'function') {
		hook();
		return 'hook';
	}
	const event = new CustomEvent('absolute-voice-simulate-disconnect', { bubbles: true });
	window.dispatchEvent(event);
	document.dispatchEvent(event);
	document.querySelector('[data-voice-htmx]')?.dispatchEvent(event);
	return 'event';
})()`;

const disconnectHookReadyExpression = `(() => {
	return typeof window.__absoluteVoiceDemoSimulateDisconnect === 'function' ||
		Boolean(document.querySelector('[data-voice-htmx]'));
})()`;

const openTrackedSocketCountExpression = `(() => {
	const sockets = window.__absoluteVoiceSmokeSockets ?? [];
	return sockets.filter((socket) => socket.readyState === WebSocket.OPEN && socket.url.includes('/voice/')).length;
})()`;

const waitForReconnectText = async (
  session: ChromeSession,
  pattern: RegExp,
  timeoutMs: number,
) => {
  const startedAt = Date.now();
  let latest = "";

  while (Date.now() - startedAt < timeoutMs) {
    latest = await evaluate<string>(session, reconnectExpression);
    if (pattern.test(latest)) {
      return latest;
    }
    await wait(100);
  }

  throw new Error(
    `Timed out waiting for ${pattern}. Latest: ${latest || "<empty>"}`,
  );
};

const waitForOpenVoiceSockets = async (
  session: ChromeSession,
  page: string,
  timeoutMs: number,
) => {
  const startedAt = Date.now();
  let latest = 0;

  while (Date.now() - startedAt < timeoutMs) {
    latest = await evaluate<number>(session, openTrackedSocketCountExpression);
    if (latest > 0) {
      return latest;
    }
    await wait(100);
  }

  throw new Error(
    `${page} did not open a tracked voice WebSocket. Latest count: ${latest}`,
  );
};

const waitForDisconnectHook = async (
  session: ChromeSession,
  page: string,
  timeoutMs: number,
) => {
  const startedAt = Date.now();
  let latest = false;

  while (Date.now() - startedAt < timeoutMs) {
    latest = await evaluate<boolean>(session, disconnectHookReadyExpression);
    if (latest) {
      return;
    }
    await wait(100);
  }

  throw new Error(`${page} did not install the reconnect smoke hook.`);
};

const checkPage = async (page: (typeof pages)[number]) => {
  const url = `${appOrigin}/${page}?engine=${expected.engine}&provider=${expected.provider}&routing=${expected.routing}`;
  const session = await createChromeSession(url);

  try {
    await session.send("Runtime.enable");
    await session.send("Network.enable");
    await session.send("Page.enable");
    await session.send("Page.addScriptToEvaluateOnNewDocument", {
      source: installWebSocketTrackerExpression,
    });
    await session.send("Page.navigate", { url });
    await wait(page === "angular" ? 4_000 : 2_500);

    const initial = await waitForReconnectText(session, /idle|resumed/, 5_000);
    let openSockets = 0;
    let disconnectMode = "not-run";
    openSockets = await waitForOpenVoiceSockets(session, page, 8_000);
    await waitForDisconnectHook(session, page, 5_000);
    disconnectMode = await evaluate<string>(
      session,
      simulateDisconnectExpression,
    );
    let reconnecting = "";
    try {
      reconnecting = await waitForReconnectText(
        session,
        /reconnecting|resumed/,
        12_000,
      );
    } catch (error) {
      const latest = await evaluate<string>(session, reconnectExpression);
      throw new Error(
        `${page} did not enter reconnecting/resumed after ${disconnectMode} disconnect with ${openSockets} open sockets. Latest: ${latest || "<empty>"}. ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    let resumed = "";
    try {
      resumed = await waitForReconnectText(session, /resumed/, 20_000);
    } catch (error) {
      const latest = await evaluate<string>(session, reconnectExpression);
      throw new Error(
        `${page} did not resume after ${disconnectMode} disconnect with ${openSockets} open sockets. Latest: ${latest || "<empty>"}. ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      initial,
      disconnectMode,
      openSockets,
      page,
      reconnecting,
      resumed,
    };
  } finally {
    await session.close();
  }
};

const startedServer =
  process.env.VOICE_SMOKE_USE_EXISTING_SERVER === "1"
    ? null
    : spawnProcess(["bun", "run", "dev"], { PORT: "3004" });
const startedChrome =
  process.env.VOICE_SMOKE_USE_EXISTING_CHROME === "1"
    ? null
    : spawnProcess([
        "google-chrome",
        "--headless=new",
        "--remote-debugging-port=9223",
        "--disable-gpu",
        "--no-sandbox",
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

  const results = [];
  for (const page of pages) {
    results.push(await checkPage(page));
  }

  console.log(JSON.stringify(results, null, 2));
} finally {
  startedChrome?.stop();
  startedServer?.stop();
}
