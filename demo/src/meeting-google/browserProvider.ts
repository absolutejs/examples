/**
 * STAGED FOR EXTRACTION as `@absolutejs/meeting-google` (browser variant).
 *
 * `createBrowserMeetProvider` — creates a Google Meet by attaching over CDP to a
 * normally-launched, already-signed-in Chrome and driving meet.google.com/new.
 *
 * Why this beats the Calendar-API path for interactive/demo use:
 *  - No OAuth client, no consent screen, no Calendar API — none of Google's
 *    automation walls. A Chrome YOU launched has no automation fingerprint
 *    (navigator.webdriver === false), so Google treats it as a real signed-in
 *    user. The attached tab IS the live host view the recorder captures.
 *
 * BUN-NATIVE: this talks raw CDP over Bun's built-in WebSocket — NOT Playwright's
 * connectOverCDP (whose vendored `ws` transport hangs under Bun). Bun's native
 * WebSocket speaks CDP fine, so no Node subprocess and no Playwright dependency
 * for this provider. CDP is just JSON-over-websocket.
 *
 * Setup (once): launch Chrome with a debug port and sign into Google in it —
 *   google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.demo-chrome-cdp"
 */
import type { CreatedMeeting, MeetingProvider } from "./types";

export type BrowserMeetProviderOptions = {
	/** CDP endpoint of a normally-launched, signed-in Chrome. Default 127.0.0.1:9222
	 *  (IPv4 — Chrome's debug port is IPv4-only). */
	cdpEndpoint?: string;
	/** Max time to wait for the meeting code to appear. Default 45s. */
	timeoutMs?: number;
};

const MEET_CODE = /meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/;

// Minimal CDP client over Bun's native WebSocket: id-matched commands, optional
// per-target sessionId. Enough to create + drive a page; no deps.
const connectCdp = async (wsUrl: string) => {
	const socket = new WebSocket(wsUrl);
	await new Promise<void>((resolve, reject) => {
		socket.onopen = () => resolve();
		socket.onerror = () => reject(new Error("CDP websocket failed to open"));
	});
	let nextId = 1;
	const pending = new Map<
		number,
		{ resolve: (value: Record<string, unknown>) => void; reject: (e: Error) => void }
	>();
	socket.onmessage = (event) => {
		const message = JSON.parse(String(event.data)) as {
			id?: number;
			result?: Record<string, unknown>;
			error?: unknown;
		};
		if (typeof message.id !== "number") return;
		const waiter = pending.get(message.id);
		if (!waiter) return;
		pending.delete(message.id);
		if (message.error) {
			waiter.reject(new Error(JSON.stringify(message.error)));
		} else {
			waiter.resolve(message.result ?? {});
		}
	};
	const send = (
		method: string,
		params: Record<string, unknown> = {},
		sessionId?: string,
	) => {
		const id = nextId++;
		socket.send(
			JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }),
		);
		return new Promise<Record<string, unknown>>((resolve, reject) =>
			pending.set(id, { resolve, reject }),
		);
	};
	return { close: () => socket.close(), send };
};

export const createBrowserMeetProvider = (
	options: BrowserMeetProviderOptions = {},
): MeetingProvider => {
	const endpoint = options.cdpEndpoint ?? "http://127.0.0.1:9222";
	const timeoutMs = options.timeoutMs ?? 45_000;
	return {
		createMeeting: async (): Promise<CreatedMeeting> => {
			const version = (await fetch(`${endpoint}/json/version`).then((r) =>
				r.json(),
			)) as { webSocketDebuggerUrl?: string };
			if (!version.webSocketDebuggerUrl) {
				throw new Error(
					`No CDP endpoint at ${endpoint}. Launch Chrome with --remote-debugging-port and sign into Google.`,
				);
			}
			const cdp = await connectCdp(version.webSocketDebuggerUrl);
			try {
				const { targetId } = (await cdp.send("Target.createTarget", {
					url: "https://meet.google.com/new",
				})) as { targetId: string };
				const { sessionId } = (await cdp.send("Target.attachToTarget", {
					flatten: true,
					targetId,
				})) as { sessionId: string };
				const evaluate = async (expression: string) => {
					const evaluated = (await cdp
						.send(
							"Runtime.evaluate",
							{ expression, returnByValue: true, userGesture: true },
							sessionId,
						)
						.catch(() => ({}))) as { result?: { value?: unknown } };
					return evaluated.result?.value;
				};

				// 1) Navigating /new creates the meeting; the code lands in the URL
				//    at the green room on its own (no click needed for the link).
				const deadline = Date.now() + timeoutMs;
				let url = "";
				while (Date.now() < deadline) {
					const match = String(await evaluate("location.href")).match(
						MEET_CODE,
					);
					if (match) {
						url = `https://meet.google.com/${match[1]}`;
						break;
					}
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
				if (!url) {
					await cdp.send("Target.closeTarget", { targetId }).catch(
						() => undefined,
					);
					cdp.close();
					throw new Error("Meet creation timed out (no meeting code).");
				}

				// 2) Get the host INTO the call (so it can admit guests + be the
				//    visible participant). "Join now" needs a trusted gesture; loop
				//    until the join button is gone.
				const joinScript = `(() => { try {
					const btns = Array.from(document.querySelectorAll("button"));
					const mic = btns.find((b) => /continue without microphone/i.test(b.textContent || ""));
					if (mic) mic.click();
					const join = btns.find((b) => /join now|ask to join/i.test(b.textContent || ""));
					if (join) { join.click(); return "joining"; }
					return "joined";
				} catch { return "error"; } })()`;
				const joinDeadline = Date.now() + 20_000;
				while (Date.now() < joinDeadline) {
					if ((await evaluate(joinScript)) === "joined") break;
					await new Promise((resolve) => setTimeout(resolve, 1500));
				}

				// 3) Auto-admit anyone who knocks (the Recall bot lands in the
				//    waiting room; Meet needs the host to admit). Material's admit
				//    pill ignores synthetic .click(), so find its center and
				//    dispatch a REAL mouse click via CDP Input. Runs on a loop so
				//    a two-step pill→panel admit resolves on the next tick.
				const admitCoordsScript = `(() => { try {
					const els = Array.from(document.querySelectorAll("button, [role=button], span, div"));
					const el = els.find((e) => /^admit/i.test((e.textContent || "").trim()) && e.getClientRects().length);
					if (!el) return null;
					const r = el.getBoundingClientRect();
					return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
				} catch { return null; } })()`;
				const admitTimer = setInterval(() => {
					void (async () => {
						const coords = (await evaluate(admitCoordsScript)) as
							| { x: number; y: number }
							| null;
						if (!coords || typeof coords.x !== "number") return;
						for (const type of ["mousePressed", "mouseReleased"]) {
							await cdp
								.send(
									"Input.dispatchMouseEvent",
									{
										button: "left",
										clickCount: 1,
										type,
										x: coords.x,
										y: coords.y,
									},
									sessionId,
								)
								.catch(() => undefined);
						}
					})();
				}, 2500);

				return {
					dispose: async () => {
						clearInterval(admitTimer);
						await cdp
							.send("Target.closeTarget", { targetId })
							.catch(() => undefined);
						cdp.close();
					},
					eventId: targetId,
					platform: "google-meet",
					url,
				};
			} catch (caught) {
				cdp.close();
				throw caught;
			}
		},
	};
};
