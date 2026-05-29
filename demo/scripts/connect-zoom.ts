/**
 * Supervised Zoom Server-to-Server OAuth credential grabber.
 *
 * Drives your signed-in real Chrome (CDP on :9222, bun-native). YOU create a
 * Server-to-Server OAuth app (scope meeting:write, Activate) and open its
 * "App Credentials" tab; this scans ALL open marketplace tabs and scrapes
 * Account ID / Client ID / Client Secret into ./.env. Screenshots the app page
 * each cycle (/tmp/zoom-connect.png) for diagnosis.
 *
 * Run:  bun run scripts/connect-zoom.ts
 */
const CDP = "http://127.0.0.1:9222";
const ENV_PATH = `${process.cwd()}/.env`;

const ver = (await fetch(`${CDP}/json/version`).then((r) => r.json())) as {
	webSocketDebuggerUrl: string;
};
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise<void>((res) => {
	ws.onopen = () => res();
});
let id = 1;
const pend = new Map<number, (m: Record<string, unknown>) => void>();
ws.onmessage = (e) => {
	const m = JSON.parse(String(e.data)) as { id?: number };
	if (typeof m.id === "number" && pend.has(m.id)) {
		pend.get(m.id)?.(m as Record<string, unknown>);
		pend.delete(m.id);
	}
};
const send = (method: string, params: Record<string, unknown> = {}, sid?: string) => {
	const i = id++;
	ws.send(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) }));
	return new Promise<Record<string, unknown>>((r) => pend.set(i, r));
};

const scrapeScript = `(() => {
	for (const b of document.querySelectorAll("button,[role=button]")) {
		const t = (b.textContent || "").trim().toLowerCase();
		if (t === "show" || t === "reveal") { try { b.click(); } catch {} }
	}
	const out = {};
	const leaves = [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent && e.textContent.trim().length < 40);
	for (const lab of leaves) {
		const text = lab.textContent.trim();
		const key = /^account id$/i.test(text) ? "account" : /^client id$/i.test(text) ? "clientId" : /^client secret$/i.test(text) ? "secret" : null;
		if (!key || out[key]) continue;
		let node = lab.parentElement, val = "";
		for (let up = 0; up < 6 && node; up++) {
			const inp = node.querySelector("input,textarea"); if (inp && inp.value && inp.value.trim().length > 6) { val = inp.value.trim(); break; }
			const cp = node.querySelector("[data-clipboard-text]"); if (cp) { val = (cp.getAttribute("data-clipboard-text") || "").trim(); break; }
			node = node.parentElement;
		}
		if (val) out[key] = val;
	}
	return JSON.stringify(out);
})()`;

const sessions = new Map<string, string>(); // targetId -> sessionId
const scrapeAll = async (): Promise<{ account?: string; clientId?: string; secret?: string }> => {
	const { result } = (await send("Target.getTargets")) as {
		result: { targetInfos: { targetId: string; url: string; type: string }[] };
	};
	const tabs = result.targetInfos.filter(
		(t) => t.type === "page" && t.url.includes("marketplace.zoom.us"),
	);
	const merged: Record<string, string> = {};
	let appShot: string | undefined;
	for (const tab of tabs) {
		let sid = sessions.get(tab.targetId);
		if (!sid) {
			const att = (await send("Target.attachToTarget", {
				flatten: true,
				targetId: tab.targetId,
			})) as { result?: { sessionId?: string } };
			sid = att.result?.sessionId;
			if (sid) sessions.set(tab.targetId, sid);
		}
		if (!sid) continue;
		const r = (await send(
			"Runtime.evaluate",
			{ expression: scrapeScript, returnByValue: true },
			sid,
		).catch(() => ({}))) as { result?: { result?: { value?: string } } };
		try {
			Object.assign(merged, JSON.parse(r.result?.result?.value ?? "{}"));
		} catch {
			/* skip */
		}
		if (/develop\/apps\//.test(tab.url)) appShot = sid;
	}
	if (appShot) {
		const shot = (await send("Page.captureScreenshot", { format: "png" }, appShot)) as {
			result?: { data?: string };
		};
		if (shot.result?.data) {
			await Bun.write("/tmp/zoom-connect.png", Buffer.from(shot.result.data, "base64"));
		}
	}
	return merged;
};

const log = (m: string) => console.log(`[zoom] ${m}`);
log(">>> Create the Server-to-Server OAuth app, add scope meeting:write,");
log(">>> Activate, and open its 'App Credentials' tab. Scanning all marketplace tabs…");
let creds: { account?: string; clientId?: string; secret?: string } = {};
for (let i = 0; i < 150; i += 1) {
	await new Promise((r) => setTimeout(r, 4000));
	creds = await scrapeAll();
	const have = (["account", "clientId", "secret"] as const).filter((k) => creds[k]);
	if (i % 3 === 0) log(`…​ found: ${have.join(", ") || "(none yet)"}`);
	if (have.length === 3) break;
}
if (!(creds.account && creds.clientId && creds.secret)) {
	log("!! couldn't scrape all three — see /tmp/zoom-connect.png. Paste manually if needed.");
	ws.close();
	process.exit(1);
}
let envText = "";
try {
	envText = await Bun.file(ENV_PATH).text();
} catch {
	envText = "";
}
const set = (key: string, value: string) => {
	const line = `${key}=${value}`;
	envText = new RegExp(`^${key}=.*$`, "m").test(envText)
		? envText.replace(new RegExp(`^${key}=.*$`, "m"), line)
		: `${envText.replace(/\n?$/, "\n")}${line}\n`;
};
set("ZOOM_ACCOUNT_ID", creds.account);
set("ZOOM_CLIENT_ID", creds.clientId);
set("ZOOM_CLIENT_SECRET", creds.secret);
await Bun.write(ENV_PATH, envText);
log("✓ wrote ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET to .env");
ws.close();
process.exit(0);
