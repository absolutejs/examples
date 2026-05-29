/**
 * STAGED FOR EXTRACTION as `@absolutejs/demo` (a second `DemoBrowserDriver`).
 *
 * A `DemoBrowserDriver` backed by **bun-native raw Chrome DevTools Protocol**,
 * attached to a normally-launched Chrome on `--remote-debugging-port`. This is
 * the driver the *inline-real* demo uses: it drives the SAME visible,
 * already-signed-in Chrome window that x11grab is capturing, so the product
 * walkthrough, a real Zoom call, and a real Discord view all happen in one
 * continuous window with one continuous screen+audio capture.
 *
 * Why not Playwright here: `connectOverCDP` hangs under Bun, and a
 * Playwright-launched Chrome is automation-controlled, which Google/Discord
 * block at login. Attaching to a user-launched Chrome over bun-native CDP
 * sidesteps both (same transport that creates Meet / scrapes Zoom in this repo).
 * See the [[playwright-cdp-under-bun]] memory.
 */
import type { DemoArtifact, DemoBrowserDriver } from "../../../demo/dist/index";
import { writeFile } from "node:fs/promises";

type Pending = (message: Record<string, unknown>) => void;

export type CdpDemoBrowserOptions = {
	/** DevTools HTTP base, e.g. http://127.0.0.1:9222. */
	cdpUrl?: string;
	/** Reuse an existing page target id; otherwise the first page is used. */
	targetId?: string;
	/** Open a fresh tab for the demo instead of reusing an existing page. */
	createTab?: boolean;
	/** Navigate the attached page here on connect (e.g. the fixture URL). */
	startUrl?: string;
	/** Maximize the browser window (clean full-window screen capture). */
	maximize?: boolean;
	screenshotDir?: string;
	/** Per-call timeout for waiting on selectors / navigation (ms). */
	defaultTimeoutMs?: number;
};

export type CdpDemoBrowser = {
	driver: DemoBrowserDriver;
	/** Low-level escape hatch: send a CDP method on the page session. */
	send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
	/** Evaluate a function-source string with a JSON arg in the page. */
	evaluate: <T>(fnSource: string, arg?: unknown) => Promise<T>;
	targetId: string;
	close: () => Promise<void>;
	/** Close the demo tab (browser-level), leaving the rest of Chrome intact. */
	closeTab: () => Promise<void>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createCdpDemoBrowser = async (
	options: CdpDemoBrowserOptions = {},
): Promise<CdpDemoBrowser> => {
	const cdpUrl = options.cdpUrl ?? "http://127.0.0.1:9222";
	const timeoutMs = options.defaultTimeoutMs ?? 15000;

	const version = (await fetch(`${cdpUrl}/json/version`).then((response) =>
		response.json(),
	)) as { webSocketDebuggerUrl: string };
	const socket = new WebSocket(version.webSocketDebuggerUrl);
	await new Promise<void>((resolve, reject) => {
		socket.onopen = () => resolve();
		socket.onerror = () => reject(new Error("CDP websocket failed to open"));
	});

	let nextId = 1;
	const pending = new Map<number, Pending>();
	socket.onmessage = (event) => {
		const message = JSON.parse(String(event.data)) as { id?: number };
		if (typeof message.id === "number" && pending.has(message.id)) {
			pending.get(message.id)?.(message as Record<string, unknown>);
			pending.delete(message.id);
		}
	};
	const rawSend = (
		method: string,
		params: Record<string, unknown> = {},
		sessionId?: string,
	) => {
		const id = nextId++;
		socket.send(
			JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }),
		);
		return new Promise<Record<string, unknown>>((resolve) =>
			pending.set(id, resolve),
		);
	};

	// Open a fresh tab, reuse a requested one, or fall back to the first page.
	let targetId: string;
	if (options.createTab) {
		const created = (await rawSend("Target.createTarget", {
			url: options.startUrl ?? "about:blank",
		})) as { result?: { targetId?: string } };
		if (!created.result?.targetId) {
			throw new Error("CDP Target.createTarget returned no targetId");
		}
		targetId = created.result.targetId;
		await rawSend("Target.activateTarget", { targetId });
	} else {
		const targets = (await rawSend("Target.getTargets")) as {
			result: {
				targetInfos: { targetId: string; type: string; url: string }[];
			};
		};
		const page =
			(options.targetId
				? targets.result.targetInfos.find(
						(t) => t.targetId === options.targetId,
					)
				: undefined) ??
			targets.result.targetInfos.find((t) => t.type === "page");
		if (!page) {
			throw new Error(
				"No page target on the debug Chrome. Open a tab in the :9222 Chrome first.",
			);
		}
		targetId = page.targetId;
	}
	const attach = (await rawSend("Target.attachToTarget", {
		flatten: true,
		targetId,
	})) as { result?: { sessionId?: string } };
	const sessionId = attach.result?.sessionId;
	if (!sessionId) throw new Error("CDP attachToTarget returned no sessionId");

	const send = (method: string, params: Record<string, unknown> = {}) =>
		rawSend(method, params, sessionId);
	await send("Page.enable");
	await send("Runtime.enable");
	await send("DOM.enable");
	if (options.maximize) {
		const win = (await rawSend("Browser.getWindowForTarget", {
			targetId,
		}).catch(() => ({}))) as { result?: { windowId?: number } };
		if (win.result?.windowId !== undefined) {
			await rawSend("Browser.setWindowBounds", {
				bounds: { windowState: "maximized" },
				windowId: win.result.windowId,
			}).catch(() => undefined);
		}
		await rawSend("Target.activateTarget", { targetId }).catch(
			() => undefined,
		);
	}

	const evaluate = async <T>(fnSource: string, arg?: unknown): Promise<T> => {
		// Mirror the Playwright driver contract: `fnSource` is a function-source
		// string called with `arg`. Inject arg as a JSON literal so serializable
		// timelines/events round-trip exactly.
		const expression = `(${fnSource})(${arg === undefined ? "" : JSON.stringify(arg)})`;
		const response = (await send("Runtime.evaluate", {
			awaitPromise: true,
			expression,
			returnByValue: true,
			userGesture: true,
		})) as {
			result?: {
				exceptionDetails?: { exception?: { description?: string }; text?: string };
				result?: { value?: T };
			};
		};
		const details = response.result?.exceptionDetails;
		if (details) {
			throw new Error(
				`CDP evaluate failed: ${details.exception?.description ?? details.text ?? "unknown"}`,
			);
		}
		return response.result?.result?.value as T;
	};

	const querySelectorExists = (selector: string) =>
		evaluate<boolean>(
			"(sel) => !!document.querySelector(sel)",
			selector,
		);

	const waitForSelector = async (selector: string) => {
		const deadline = Date.now() + timeoutMs;
		for (;;) {
			if (await querySelectorExists(selector)) return;
			if (Date.now() > deadline) {
				throw new Error(`Timed out waiting for selector: ${selector}`);
			}
			await sleep(120);
		}
	};

	const goto = async (url: string) => {
		await send("Page.navigate", { url });
		const deadline = Date.now() + timeoutMs;
		for (;;) {
			const state = await evaluate<string>("() => document.readyState").catch(
				() => "loading",
			);
			if (state === "interactive" || state === "complete") return;
			if (Date.now() > deadline) return; // best-effort; some apps never idle
			await sleep(120);
		}
	};

	const focusAndClear = (selector: string) =>
		evaluate<boolean>(
			`(sel) => { const el = document.querySelector(sel); if (!el) return false; el.focus(); if ('value' in el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); } return true; }`,
			selector,
		);

	const driver: DemoBrowserDriver = {
		click: async (selector) => {
			await waitForSelector(selector);
			await evaluate(
				`(sel) => { const el = document.querySelector(sel); el && el.click(); }`,
				selector,
			);
		},
		evaluate: <T>(fn: string, arg?: unknown) => evaluate<T>(fn, arg),
		fill: async (selector, value) => {
			await waitForSelector(selector);
			await evaluate(
				`(input) => { const [sel, val] = input; const el = document.querySelector(sel); if (!el) return; el.focus(); el.value = val; el.dispatchEvent(new InputEvent('input', { bubbles: true, data: val })); el.dispatchEvent(new Event('change', { bubbles: true })); }`,
				[selector, value],
			);
		},
		goto,
		press: async (selector, key) => {
			if (selector) {
				await evaluate(
					`(sel) => { const el = document.querySelector(sel); el && el.focus(); }`,
					selector,
				);
			}
			const isEnter = key === "Enter";
			const common = isEnter
				? { code: "Enter", key: "Enter", windowsVirtualKeyCode: 13 }
				: { code: key, key };
			await send("Input.dispatchKeyEvent", { type: "keyDown", ...common });
			await send("Input.dispatchKeyEvent", { type: "keyUp", ...common });
		},
		screenshot: async (name): Promise<DemoArtifact | void> => {
			const shot = (await send("Page.captureScreenshot", { format: "png" })) as {
				result?: { data?: string };
			};
			if (!shot.result?.data) return undefined;
			const id = name ?? `cdp-screenshot-${Date.now()}`;
			const path = `${options.screenshotDir ?? "."}/${id}.png`;
			await writeFile(path, Buffer.from(shot.result.data, "base64"));
			return { id, kind: "screenshot", metadata: { source: "cdp" }, path };
		},
		type: async (selector, value, typeOptions) => {
			await waitForSelector(selector);
			await focusAndClear(selector);
			const delayMs = typeOptions?.delayMs ?? 60;
			for (const char of value) {
				// insertText is the trusted equivalent of a keystroke's text and
				// works on React-controlled inputs that ignore raw value sets.
				await send("Input.insertText", { text: char });
				if (delayMs > 0) await sleep(delayMs);
			}
		},
		waitFor: async (target) => {
			if (typeof target === "number") {
				await sleep(target);
				return;
			}
			await waitForSelector(target);
		},
	};

	return {
		close: async () => {
			await rawSend("Target.detachFromTarget", { sessionId }).catch(
				() => undefined,
			);
			socket.close();
		},
		closeTab: async () => {
			await rawSend("Target.closeTarget", { targetId }).catch(
				() => undefined,
			);
		},
		driver,
		evaluate,
		send,
		targetId,
	};
};
