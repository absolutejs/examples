/**
 * Drive a REAL Zoom meeting open *in the visible browser* via bun-native CDP,
 * so the inline demo can show the live meeting (with the Recall speaker bot
 * talking inside it) as a real on-screen app — not a mocked panel.
 *
 * The whole join flow runs through the user's signed-in Chrome on the page
 * session of `@absolutejs/demo`'s CDP browser driver: the launch page is the
 * top document (cookies + "Join from browser"); the meeting client itself is a
 * SAME-ORIGIN iframe (app.zoom.us/wc) reached through `contentDocument`, which
 * is why selector-driving works without pixel-guessing. The mic/cam prompts are
 * dismissed ("continue without …") and we Join Audio by computer so the bot is
 * audible; this Chrome needs no microphone (we only listen).
 */

type CdpLike = {
	send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
	evaluate: <T>(fnSource: string, arg?: unknown) => Promise<T>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Run an expression inside the same-origin Zoom web-client iframe. Returns the
// fn's value, or the sentinel "__no_iframe__" until the iframe exists.
const inIframe = <T>(browser: CdpLike, body: string): Promise<T | "__no_iframe__"> =>
	browser.evaluate<T | "__no_iframe__">(
		`() => { const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return "__no_iframe__"; const d = f.contentDocument; return (${body})(d); }`,
	);

const setReactInputValue = (selectorVar: string) =>
	`(d) => { const i = [...d.querySelectorAll(${selectorVar})].filter((x) => x.offsetParent !== null)[0]; if (!i) return false; const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i), 'value').set; i.focus(); set.call(i, "__VALUE__"); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return true; }`;

export type JoinZoomOptions = {
	displayName?: string;
	/** How long to keep polling each stage before giving up (ms). */
	stageTimeoutMs?: number;
};

/**
 * Navigate the attached page to a Zoom join URL and drive the browser-join all
 * the way into the live meeting. Resolves once the in-meeting toolbar is up.
 */
export const joinZoomInBrowser = async (
	browser: CdpLike,
	joinUrl: string,
	options: JoinZoomOptions = {},
): Promise<{ joined: boolean }> => {
	const name = options.displayName ?? "Deal Room Demo";
	const stageTimeout = options.stageTimeoutMs ?? 25000;

	await browser.send("Page.navigate", { url: joinUrl });
	await sleep(7000);

	// Top document: accept the cookie banner, then "Join from browser".
	await browser
		.evaluate(
			`() => { const b = [...document.querySelectorAll('button')].find((x) => /Accept All Cookies/i.test(x.textContent || '')); b && b.click(); }`,
		)
		.catch(() => undefined);
	await sleep(800);
	await browser.evaluate(
		`() => { const a = [...document.querySelectorAll('a,button')].find((x) => /Join from browser/i.test((x.textContent || '').trim())); a && a.click(); }`,
	);

	// Wait for the same-origin web-client iframe to mount.
	const iframeDeadline = Date.now() + stageTimeout;
	for (;;) {
		const ready = await inIframe<boolean>(
			browser,
			`(d) => !!d.querySelector('input[type="text"]') || [...d.querySelectorAll('button')].some((b) => /^Join$/i.test((b.textContent || '').trim()))`,
		);
		if (ready === true) break;
		if (Date.now() > iframeDeadline) return { joined: false };
		await sleep(500);
	}

	// Dismiss the "see/hear you in the meeting?" prompts (there can be two).
	for (let i = 0; i < 3; i += 1) {
		const dismissed = await inIframe<string>(
			browser,
			`(d) => { const b = [...d.querySelectorAll('button,a')].find((x) => /Continue without microphone/i.test(x.textContent || '')); if (b) { b.click(); return 'x'; } return ''; }`,
		);
		if (dismissed !== "x") break;
		await sleep(1500);
	}

	// Fill the name (React-controlled → native setter) and Join.
	await inIframe(
		browser,
		setReactInputValue(`'input[type="text"]'`).replace("__VALUE__", name),
	);
	await sleep(700);
	await inIframe(
		browser,
		`(d) => { const b = [...d.querySelectorAll('button')].find((x) => /^Join$/i.test((x.textContent || '').trim()) && !x.disabled); b && b.click(); return !!b; }`,
	);

	// Wait until the in-meeting toolbar is present.
	const meetingDeadline = Date.now() + stageTimeout;
	for (;;) {
		const inMeeting = await inIframe<boolean>(
			browser,
			`(d) => [...d.querySelectorAll('[aria-label]')].some((e) => /leave|participants|join audio|unmute|^mute/i.test(e.getAttribute('aria-label') || ''))`,
		);
		if (inMeeting === true) break;
		if (Date.now() > meetingDeadline) return { joined: false };
		await sleep(500);
	}

	// Dismiss a re-shown mic/cam prompt, then Join Audio by computer so the
	// Recall bot is audible (no mic needed — output only).
	for (let i = 0; i < 2; i += 1) {
		await inIframe(
			browser,
			`(d) => { const b = [...d.querySelectorAll('button,a')].find((x) => /Continue without microphone/i.test(x.textContent || '')); b && b.click(); }`,
		);
		await sleep(900);
	}
	await inIframe(
		browser,
		`(d) => { const b = [...d.querySelectorAll('button,[aria-label]')].find((x) => /join audio/i.test((x.getAttribute && x.getAttribute('aria-label')) || x.textContent || '')); b && b.click(); }`,
	);
	await sleep(1500);
	await inIframe(
		browser,
		`(d) => { const b = [...d.querySelectorAll('button')].find((x) => /Join Audio by Computer|Computer Audio/i.test(x.textContent || '')); b && b.click(); }`,
	);
	await sleep(1200);

	return { joined: true };
};

/** Leave the meeting and close nothing (caller manages the tab). */
export const leaveZoomInBrowser = async (browser: CdpLike): Promise<void> => {
	await inIframe(
		browser,
		`(d) => { const b = [...d.querySelectorAll('button,[aria-label]')].find((x) => /^leave$/i.test(((x.getAttribute && x.getAttribute('aria-label')) || x.textContent || '').trim())); b && b.click(); }`,
	).catch(() => undefined);
	await sleep(800);
	await inIframe(
		browser,
		`(d) => { const b = [...d.querySelectorAll('button')].find((x) => /Leave Meeting/i.test(x.textContent || '')); b && b.click(); }`,
	).catch(() => undefined);
};
