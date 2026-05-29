import {
	createDemoRunner,
	goto,
	markRecording,
	wait,
	writeDemoManifest,
	type DemoArtifact,
	type DemoCredentialProfile,
	type DemoRunReport,
	createElevenLabsVoiceover,
	withPronunciationAliases,
	createDemoSyncPlan,
} from "../../../demo/dist/index";
import { createDemoAuthDriver } from "../../../demo/dist/auth";
import { composeDemoWithFFmpeg } from "../../../demo/dist/composition";
import { createPlaywrightDemoSession } from "../../../demo/dist/playwright";
import { createScreenRecorder } from "../../../demo/dist/recording";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";

// Inline-real mode (DEMO_INLINE=true): instead of recording the Playwright page,
// run the whole walkthrough inside the user's signed-in Chrome over bun-native
// CDP, capture the desktop (x11grab + RDPSink.monitor playback audio), and
// splice the REAL Discord voice scene in where the mocked Discord panel used to
// be. The live Discord bot audio is captured by the recorder; narration is mixed
// on top at compose time (audioMode "voiceover+recording"). The live Zoom scene
// is gated separately (DEMO_INLINE_ZOOM) and stays off until Zoom Pro — see
// ZOOM-PRO-UPGRADE.md. cdp-browser / scene modules are imported lazily so the
// default Playwright path never loads the Discord/native stack.
const INLINE = (() => {
	const value = process.env.DEMO_INLINE;
	return value === "1" || value?.toLowerCase() === "true";
})();
// The on-screen timeline debug HUD is a dev aid. It stays on for the default
// (Playwright) render, but is hidden for the polished inline render unless
// DEMO_DEBUG_OVERLAY=true is set explicitly.
const DEBUG_OVERLAY = (() => {
	const value = process.env.DEMO_DEBUG_OVERLAY;
	if (value !== undefined) {
		return value === "1" || value.toLowerCase() === "true";
	}
	return !(
		process.env.DEMO_INLINE === "1" ||
		process.env.DEMO_INLINE?.toLowerCase() === "true"
	);
})();
// The real Discord scene needs a Chrome signed into Discord; set
// DEMO_INLINE_DISCORD=false to exercise the rest of the inline pipeline
// (CDP walkthrough + desktop capture + compose) without it.
const DISCORD_SCENE = (() => {
	const value = process.env.DEMO_INLINE_DISCORD;
	return value === undefined || value === "1" || value.toLowerCase() === "true";
})();
// Where the signed-in debug Chrome's DevTools endpoint lives. The launcher may
// bind IPv4 or IPv6; resolve whichever actually answers at runtime.
const resolveCdpUrl = async (): Promise<string> => {
	const candidates = [
		process.env.DEMO_CDP_URL,
		"http://127.0.0.1:9222",
		"http://[::1]:9222",
	].filter((value): value is string => Boolean(value));
	for (const base of candidates) {
		try {
			const response = await fetch(`${base}/json/version`, {
				signal: AbortSignal.timeout(3000),
			});
			if (response.ok) return base;
		} catch {
			/* try next */
		}
	}
	throw new Error(
		"DEMO_INLINE needs a debug Chrome on :9222 (signed into Discord). " +
			"Launch: google-chrome --remote-debugging-port=9222 --user-data-dir=…",
	);
};
// Find the X window id of the Chrome browser window to capture (the WSLg root is
// black, so we grab the window directly). Picks the largest Chrome window, or
// the one whose title contains DEMO_CHROME_WINDOW_MATCH (e.g. its user-data-dir).
const resolveChromeWindowId = async (
	match?: string,
): Promise<string | undefined> => {
	try {
		const proc = Bun.spawn(["xwininfo", "-root", "-tree"], {
			env: { ...process.env, DISPLAY: process.env.DISPLAY ?? ":0" },
			stderr: "ignore",
			stdout: "pipe",
		});
		const [out] = await Promise.all([
			new Response(proc.stdout).text(),
			proc.exited,
		]);
		const candidates: { area: number; id: string; title: string }[] = [];
		for (const line of out.split("\n")) {
			const match2 =
				/(0x[0-9a-f]+)\s+"([^"]*)":\s+\("[^"]*"\s+"([^"]*)"\)\s+(\d+)x(\d+)\+/.exec(
					line,
				);
			if (!match2) continue;
			const [, id, title, cls, width, height] = match2;
			if (!/chrome|chromium/i.test(cls)) continue;
			candidates.push({
				area: Number(width) * Number(height),
				id,
				title,
			});
		}
		const filtered = match
			? candidates.filter((candidate) => candidate.title.includes(match))
			: candidates;
		return (filtered.length ? filtered : candidates).sort(
			(left, right) => right.area - left.area,
		)[0]?.id;
	} catch {
		return undefined;
	}
};
// WSLg PulseAudio capture is unreliable (the sink suspends and blocks ffmpeg),
// so inline mode records video-only and muxes the Discord bots' actual TTS as
// timed clips instead — deterministic and perfectly synced. 16-bit mono PCM →
// WAV the composer can place at a video offset.
const pcmToWav = (pcm: Int16Array | Buffer, sampleRateHz: number): Buffer => {
	const data = Buffer.isBuffer(pcm)
		? pcm
		: Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
	const header = Buffer.alloc(44);
	header.write("RIFF", 0);
	header.writeUInt32LE(36 + data.length, 4);
	header.write("WAVE", 8);
	header.write("fmt ", 12);
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20); // PCM
	header.writeUInt16LE(1, 22); // mono
	header.writeUInt32LE(sampleRateHz, 24);
	header.writeUInt32LE(sampleRateHz * 2, 28); // byte rate (mono, 16-bit)
	header.writeUInt16LE(2, 32); // block align
	header.writeUInt16LE(16, 34); // bits per sample
	header.write("data", 36);
	header.writeUInt32LE(data.length, 40);
	return Buffer.concat([header, data]);
};
// Video offsets (ms) of each muxed Discord bot line, filled during the scene.
const discordClipOffsetsMs: Record<string, number> = {};

const runStamp = new Date()
	.toISOString()
	.replaceAll(":", "")
	.replace(/\.\d{3}Z$/, "Z");
const runSlug = `absolute-product-demo-${runStamp}`;
const outputRoot = process.env.DEMO_OUTPUT_DIR ?? ".demo-artifacts";
const runDir = `${outputRoot}/${runSlug}`;
const artifactDir = `${runDir}/artifacts`;
const videoDir = `${runDir}/video`;
const screenshotDir = `${runDir}/screenshots`;
const allowedEnvKeys = new Set([
	"ANTHROPIC_API_KEY",
	"DEEPGRAM_API_KEY",
	"ELEVENLABS_API_KEY",
	"OPENAI_API_KEY",
]);

const envFlag = (name: string, fallback = false) => {
	const value = process.env[name];
	if (value === undefined) return fallback;
	return value === "1" || value.toLowerCase() === "true";
};

const expandHome = (path: string) =>
	path.startsWith("~/") ? `${process.env.HOME}${path.slice(1)}` : path;

// Exact media duration via ffprobe. The ElevenLabs MP3 byte-length estimate is
// imprecise (VBR framing, ID3, encoder padding); using it for beat pacing made
// narrations overlap and cut each other off. ffprobe gives ground truth, so
// audio slots never collide. Streams are drained to avoid a pipe-buffer hang.
const probeDurationMs = async (path?: string): Promise<number | undefined> => {
	if (!path) return undefined;
	const proc = Bun.spawn(
		[
			"ffprobe",
			"-v",
			"error",
			"-show_entries",
			"format=duration",
			"-of",
			"default=noprint_wrappers=1:nokey=1",
			path,
		],
		{ stderr: "pipe", stdout: "pipe" },
	);
	const [out] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	const seconds = Number(out.trim());
	return Number.isFinite(seconds) && seconds > 0
		? Math.round(seconds * 1000)
		: undefined;
};

const parseEnvLine = (line: string) => {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#")) return;
	const equals = trimmed.indexOf("=");
	if (equals === -1) return;
	const key = trimmed.slice(0, equals).trim();
	if (!allowedEnvKeys.has(key) || process.env[key]) return;
	let value = trimmed.slice(equals + 1).trim();
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		value = value.slice(1, -1);
	}
	process.env[key] = value.replaceAll("\\n", "\n");
};

const loadVoiceAndAiEnv = async () => {
	const envFile =
		process.env.DEMO_ENV_FILE ?? "~/onspark/absolutejs/dealroom/.env";
	try {
		const text = await readFile(expandHome(envFile), "utf8");
		for (const line of text.split(/\r?\n/)) parseEnvLine(line);
	} catch (error) {
		if ((error as { code?: string }).code !== "ENOENT") throw error;
	}
};

const fixtureHtml = `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Absolute Demo Fixture</title>
	<style>
		* { box-sizing: border-box; }
		body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #eef2f7; color: #111827; }
		header { align-items: center; background: #101828; color: white; display: flex; justify-content: space-between; padding: 16px 26px; }
		header strong { font-size: 18px; }
		header span { color: #cbd5e1; font-size: 13px; }
		main { display: grid; gap: 18px; grid-template-columns: 232px 1fr 308px; min-height: calc(100vh - 56px); padding: 18px; }
		nav, section, aside { background: white; border: 1px solid #d9dee8; border-radius: 8px; box-shadow: 0 10px 24px rgba(16,24,40,.06); }
		nav { padding: 14px; }
		.nav-button { align-items: center; background: transparent; border: 0; border-radius: 6px; color: #334155; cursor: pointer; display: flex; font-weight: 700; gap: 8px; justify-content: space-between; margin-bottom: 8px; padding: 10px 11px; text-align: left; width: 100%; }
		.nav-button.active { background: #e6fffb; color: #0f766e; }
		section, aside { padding: 18px; }
		h1 { font-size: 28px; letter-spacing: 0; line-height: 1.1; margin: 0 0 6px; }
		h2 { font-size: 16px; margin: 0 0 12px; }
		p { color: #475569; margin: 0 0 12px; }
		button.primary { background: #0f766e; border: 0; border-radius: 6px; color: white; cursor: pointer; font-weight: 800; padding: 10px 14px; }
		button.secondary { background: #e2e8f0; border: 0; border-radius: 6px; color: #0f172a; cursor: pointer; font-weight: 800; padding: 10px 14px; }
		input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; width: 100%; }
		.toolbar { align-items: end; display: grid; gap: 12px; grid-template-columns: 1fr auto auto; margin: 16px 0; }
		.metric-grid { display: grid; gap: 12px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 16px 0; }
		.metric { border: 1px solid #e5e7eb; border-radius: 8px; min-height: 86px; padding: 13px; }
		.metric span { color: #64748b; display: block; font-size: 12px; font-weight: 800; text-transform: uppercase; }
		.metric strong { display: block; font-size: 26px; margin-top: 6px; }
		.metric.good strong { color: #047857; }
		.metric.hot strong { color: #b91c1c; }
		.pipeline { border-collapse: collapse; width: 100%; }
		.pipeline th, .pipeline td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; }
		.pipeline th { color: #64748b; font-size: 12px; text-transform: uppercase; }
		.pipeline tr.selected { background: #fff7ed; }
		.pill { border-radius: 999px; display: inline-block; font-size: 12px; font-weight: 800; padding: 4px 8px; }
		.pill.high { background: #fee2e2; color: #991b1b; }
		.pill.medium { background: #fef3c7; color: #92400e; }
		.pill.low { background: #dcfce7; color: #166534; }
		.panel { display: none; }
		.panel.active { display: block; }
		.signal-list { display: grid; gap: 10px; }
		.signal { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
		.signal strong { display: block; margin-bottom: 4px; }
		.plan { background: #ecfdf5; border: 1px solid #99f6e4; border-radius: 8px; display: none; margin-top: 12px; padding: 12px; }
		.plan ol { margin: 8px 0 0 20px; padding: 0; }
		.email { background: #f8fafc; border: 1px solid #dbe3ee; border-radius: 8px; display: none; margin-top: 12px; padding: 12px; }
		.form-grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr auto; margin-top: 14px; }
		.integration-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.integration-card { border: 1px solid #dbe3ee; border-radius: 8px; padding: 14px; }
		.integration-card strong { display: block; margin-bottom: 6px; }
		.meet-frame { background: #0f172a; border-radius: 8px; color: white; display: none; margin-top: 14px; min-height: 170px; padding: 16px; }
		.meet-frame.active { display: block; }
		.meet-tiles { display: grid; gap: 10px; grid-template-columns: repeat(3, 1fr); margin-top: 14px; }
		.meet-tile { align-items: center; background: #1e293b; border: 1px solid #334155; border-radius: 8px; display: flex; min-height: 72px; justify-content: center; }
		.discord-shell { background: #111827; border-radius: 8px; color: #e5e7eb; display: grid; grid-template-columns: 140px 1fr; min-height: 210px; overflow: hidden; }
		.discord-sidebar { background: #1f2937; padding: 12px; }
		.discord-message { border-bottom: 1px solid #374151; padding: 12px; }
		.discord-message.new { background: #064e3b; display: none; }
		.exit-slate { align-items: center; background: #ecfdf5; color: #0f172a; display: flex; inset: 0; justify-content: center; position: fixed; transition: opacity 240ms ease, visibility 240ms ease; z-index: 1200; }
		.exit-slate.hidden { opacity: 0; visibility: hidden; }
		.exit-content { max-width: 860px; padding: 44px; text-align: center; }
		.exit-content h2 { font-size: 46px; line-height: 1; margin-bottom: 16px; }
		.exit-content p { font-size: 20px; }
		.activity { display: grid; gap: 10px; }
		.activity div { border-left: 3px solid #14b8a6; padding-left: 10px; }
		.muted { color: #64748b; font-size: 12px; }
		.intro-slate { align-items: center; background: #101828; color: white; display: flex; inset: 0; justify-content: center; position: fixed; transition: opacity 320ms ease, visibility 320ms ease; z-index: 1000; }
		.intro-slate.hidden { opacity: 0; visibility: hidden; }
		.intro-content { max-width: 840px; padding: 44px; }
		.intro-kicker { color: #2dd4bf; font-size: 13px; font-weight: 900; letter-spacing: .08em; margin-bottom: 16px; text-transform: uppercase; }
		.intro-title { font-size: 56px; font-weight: 900; letter-spacing: 0; line-height: 1; margin-bottom: 16px; }
		.intro-copy { color: #d9e2ef; font-size: 20px; line-height: 1.45; max-width: 720px; }
		.recording-heartbeat { background: #14b8a6; bottom: 0; height: 3px; left: 0; position: fixed; transform-origin: left center; width: 100vw; z-index: 2147483000; animation: heartbeat-progress 40s linear infinite; }
		.recording-pulse { background: #facc15; border-radius: 999px; bottom: 9px; height: 8px; left: 10px; position: fixed; width: 8px; z-index: 2147483000; animation: heartbeat-pulse 900ms ease-in-out infinite; }
		.demo-cursor { filter: drop-shadow(0 8px 14px rgba(15,23,42,.35)); height: 30px; left: 32px; pointer-events: none; position: fixed; top: 32px; transition: left 520ms cubic-bezier(.2,.8,.2,1), top 520ms cubic-bezier(.2,.8,.2,1), transform 140ms ease; width: 22px; z-index: 2147483647; }
		.demo-cursor::before { background: #0f172a; clip-path: polygon(0 0, 0 24px, 7px 18px, 11px 29px, 16px 27px, 12px 16px, 22px 16px); content: ""; inset: 0; position: absolute; }
		.demo-cursor::after { background: white; clip-path: polygon(3px 5px, 3px 18px, 8px 14px, 12px 24px, 13px 23px, 9px 13px, 17px 13px); content: ""; inset: 0; position: absolute; }
		.demo-cursor.clicking { transform: scale(.82); }
		@keyframes heartbeat-progress { from { transform: scaleX(.01); } to { transform: scaleX(1); } }
		@keyframes heartbeat-pulse { 0%, 100% { opacity: .25; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.35); } }
	</style>
</head>
<body>
	<div class="recording-heartbeat" data-demo="recording-heartbeat"></div>
	<div class="recording-pulse" data-demo="recording-pulse"></div>
	<div class="demo-cursor" data-demo="cursor"></div>
	<div class="intro-slate" data-demo="intro-slate">
		<div class="intro-content" data-demo="intro-content">
			<div class="intro-kicker">Automated product demo</div>
			<div class="intro-title" data-demo="intro-title">Absolute Revenue Command</div>
			<div class="intro-copy" data-demo="intro-copy">A synced walkthrough with AI voiceover, real clicks, and drawn callouts around the product workflow.</div>
		</div>
	</div>
	<div class="exit-slate hidden" data-demo="exit-slate">
		<div class="exit-content" data-demo="exit-content">
			<h2 data-demo="exit-title">Demo workflow complete</h2>
			<p data-demo="exit-copy">Authentication, revenue workflow, meeting launch, Discord handoff, and follow-up automation are all captured in the run artifacts.</p>
		</div>
	</div>
	<header>
		<strong>Absolute Revenue Command</strong>
		<span data-demo="run-state">Demo workspace: live automation</span>
	</header>
	<main>
		<nav>
			<button class="nav-button active" data-demo="tab-pipeline" data-tab="pipeline">Pipeline <span>12</span></button>
			<button class="nav-button" data-demo="tab-auth" data-tab="auth">Auth <span>1</span></button>
			<button class="nav-button" data-demo="tab-risk" data-tab="risk">Risk review <span>7</span></button>
			<button class="nav-button" data-demo="tab-account" data-tab="account">Account room <span>3</span></button>
			<button class="nav-button" data-demo="tab-meet" data-tab="meet">Google Meet <span>0</span></button>
			<button class="nav-button" data-demo="tab-discord" data-tab="discord">Discord <span>2</span></button>
			<button class="nav-button" data-demo="tab-automation" data-tab="automation">Automation <span>23</span></button>
		</nav>
		<section data-demo="workspace">
			<h1 data-demo="headline">Enterprise pipeline health</h1>
			<p data-demo="subhead">Live deal risk, expansion signals, and follow-up automation.</p>
			<div class="metric-grid">
				<div class="metric good" data-demo="pipeline-total"><span>Open pipeline</span><strong>$4.8M</strong></div>
				<div class="metric hot" data-demo="risk-score"><span>At-risk deals</span><strong>7</strong></div>
				<div class="metric" data-demo="next-best-action"><span>AI next actions</span><strong>23</strong></div>
				<div class="metric" data-demo="forecast"><span>Commit forecast</span><strong>91%</strong></div>
			</div>
			<div class="toolbar">
				<label data-demo="search-wrap">Account search<input data-demo="search" placeholder="Search account" /></label>
				<button class="secondary" data-demo="ai-triage" type="button">Run AI triage</button>
				<button class="primary" data-demo="generate-plan" type="button">Generate rescue plan</button>
			</div>
			<div class="panel active" data-panel="pipeline">
				<table class="pipeline">
					<thead><tr><th>Account</th><th>Stage</th><th>Risk</th><th>Owner</th><th>Next step</th></tr></thead>
					<tbody>
						<tr><td>Northstar Bank</td><td>Security review</td><td><span class="pill medium">Medium</span></td><td>Avery</td><td>Security packet</td></tr>
						<tr class="selected" data-demo="caldera-row"><td>Caldera Health</td><td>Procurement</td><td><span class="pill high">High</span></td><td>Riley</td><td data-demo="caldera-next">Executive alignment</td></tr>
						<tr><td>OrbitOps</td><td>Legal</td><td><span class="pill low">Low</span></td><td>Jordan</td><td>Redlines</td></tr>
						<tr><td>Meridian Retail</td><td>Negotiation</td><td><span class="pill medium">Medium</span></td><td>Taylor</td><td>Discount approval</td></tr>
					</tbody>
				</table>
			</div>
			<div class="panel" data-panel="auth">
				<h2>Absolute Auth account selection</h2>
				<p data-demo="auth-copy">The demo runner can receive an account profile, sign in through the product, and continue the scripted walkthrough.</p>
				<div class="form-grid">
					<label data-demo="auth-email-wrap">Email<input data-demo="auth-email" placeholder="demo@absolutejs.com" /></label>
					<label data-demo="auth-role-wrap">Workspace<input data-demo="auth-workspace" placeholder="Revenue Command" /></label>
					<label data-demo="auth-password-wrap">Password<input data-demo="auth-password" type="password" placeholder="••••••••" /></label>
					<button class="primary" data-demo="auth-login" type="button">Sign in</button>
				</div>
				<div class="plan" data-demo="auth-ready"><strong>Authenticated</strong> Account context is ready for browser, meeting, and desktop steps.</div>
			</div>
			<div class="panel" data-panel="risk">
				<h2>Risk explainability</h2>
				<div class="signal-list">
					<div class="signal" data-demo="risk-signal-1"><strong>Procurement silence</strong><span>14 days since last buyer response.</span></div>
					<div class="signal" data-demo="risk-signal-2"><strong>Security blocker</strong><span>Data residency answer missing from packet.</span></div>
					<div class="signal" data-demo="risk-signal-3"><strong>Champion risk</strong><span>Economic buyer has not joined the last two calls.</span></div>
				</div>
			</div>
			<div class="panel" data-panel="account">
				<h2 data-demo="account-title">Caldera Health account room</h2>
				<p data-demo="account-summary">AI found three active blockers and one expansion signal in the last 30 days.</p>
				<div class="plan" data-demo="plan-ready">
					<strong>Rescue plan ready</strong>
					<ol>
						<li data-demo="plan-step-1">Send executive sponsor note today.</li>
						<li data-demo="plan-step-2">Attach pricing guardrail and residency answer.</li>
						<li data-demo="plan-step-3">Book CFO follow-up before Friday.</li>
					</ol>
				</div>
			</div>
			<div class="panel" data-panel="automation">
				<h2>Automation draft</h2>
				<button class="primary" data-demo="draft-email" type="button">Draft sponsor email</button>
				<div class="email" data-demo="email-draft">
					<strong>Subject: Caldera Health procurement unblock</strong>
					<p>Hi Morgan, here is the short path to unblock procurement while preserving the commercial terms we agreed to.</p>
				</div>
			</div>
			<div class="panel" data-panel="meet">
				<h2>Google Meet launch check</h2>
				<p data-demo="meet-copy">The demo can start a meeting, confirm camera and microphone state, and keep recording while the flow continues.</p>
				<div class="integration-grid">
					<div class="integration-card" data-demo="meet-account"><strong>Account</strong><span>demo@absolutejs.com</span></div>
					<div class="integration-card" data-demo="meet-calendar"><strong>Calendar</strong><span>Caldera rescue sync</span></div>
				</div>
				<button class="primary" data-demo="meet-start" type="button">Start Google Meet</button>
				<div class="meet-frame" data-demo="meet-frame">
					<strong data-demo="meet-status">Meet started: Caldera rescue sync</strong>
					<div class="meet-tiles">
						<div class="meet-tile">AI host</div>
						<div class="meet-tile">Riley</div>
						<div class="meet-tile">Sponsor</div>
					</div>
				</div>
			</div>
			<div class="panel" data-panel="discord">
				<h2>Discord desktop handoff</h2>
				<p data-demo="discord-copy">When browser automation is not enough, the demo runner can hand off to desktop controls for apps like Discord.</p>
				<div class="discord-shell" data-demo="discord-shell">
					<div class="discord-sidebar"># revenue-war-room<br /># caldera-health</div>
					<div>
						<div class="discord-message"><strong>Riley</strong><br />Need the CFO follow-up and pricing guardrail in one place.</div>
						<div class="discord-message"><strong>AI Demo Host</strong><br />Preparing rescue summary from the account room.</div>
						<div class="discord-message new" data-demo="discord-new-message"><strong>AI Demo Host</strong><br />Posted plan, meeting link, and sponsor email draft.</div>
					</div>
				</div>
				<button class="primary" data-demo="discord-post" type="button">Post summary</button>
			</div>
		</section>
		<aside>
			<h2>Live activity</h2>
			<div class="activity" data-demo="activity-feed">
				<div data-demo="activity-1"><strong>Signal captured</strong><br /><span class="muted">Pricing objection detected from call notes.</span></div>
				<div data-demo="activity-2"><strong>Owner assigned</strong><br /><span class="muted">Riley owns Caldera rescue motion.</span></div>
				<div data-demo="activity-3"><strong>Automation queued</strong><br /><span class="muted">Sponsor email and agenda pending approval.</span></div>
			</div>
		</aside>
	</main>
	<script>
		const activateTab = (name) => {
			document.querySelectorAll("[data-tab]").forEach((button) => {
				button.classList.toggle("active", button.dataset.tab === name);
			});
			document.querySelectorAll("[data-panel]").forEach((panel) => {
				panel.classList.toggle("active", panel.dataset.panel === name);
			});
		};
		document.querySelectorAll("[data-tab]").forEach((button) => {
			button.addEventListener("click", () => activateTab(button.dataset.tab));
		});
		document.querySelector("[data-demo='auth-login']").addEventListener("click", () => {
			document.querySelector("[data-demo='auth-ready']").style.display = "block";
			document.querySelector("[data-demo='run-state']").textContent = "Demo workspace: authenticated";
		});
		document.querySelector("[data-demo='ai-triage']").addEventListener("click", () => {
			document.querySelector("[data-demo='risk-score'] strong").textContent = "3";
			document.querySelector("[data-demo='caldera-next']").textContent = "Sponsor email drafted";
			document.querySelector("[data-demo='run-state']").textContent = "Demo workspace: triage complete";
		});
		document.querySelector("[data-demo='generate-plan']").addEventListener("click", () => {
			activateTab("account");
			document.querySelector("[data-demo='plan-ready']").style.display = "block";
		});
		document.querySelector("[data-demo='draft-email']").addEventListener("click", () => {
			document.querySelector("[data-demo='email-draft']").style.display = "block";
			document.querySelector("[data-demo='run-state']").textContent = "Demo workspace: email drafted";
		});
		document.querySelector("[data-demo='meet-start']").addEventListener("click", () => {
			document.querySelector("[data-demo='meet-frame']").classList.add("active");
			document.querySelector("[data-demo='run-state']").textContent = "Demo workspace: Meet active";
		});
		document.querySelector("[data-demo='discord-post']").addEventListener("click", () => {
			document.querySelector("[data-demo='discord-new-message']").style.display = "block";
			document.querySelector("[data-demo='run-state']").textContent = "Demo workspace: Discord updated";
		});
	</script>
</body>
</html>`;

const getFreePort = async () =>
	new Promise<number>((resolve, reject) => {
		const server = createServer();
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (!address || typeof address === "string") {
				server.close(() => reject(new Error("Failed to reserve port")));
				return;
			}
			const { port } = address;
			server.close(() => resolve(port));
		});
	});

const fixtureDebugEvents: unknown[] = [];

const startFixture = async () => {
	const port = Number(process.env.DEMO_FIXTURE_PORT ?? (await getFreePort()));
	const server = Bun.serve({
		fetch: async (request) => {
			const url = new URL(request.url);
			if (url.pathname === "/__absolute_demo_debug") {
				try {
					fixtureDebugEvents.push(await request.json());
				} catch (error) {
					fixtureDebugEvents.push({
						error:
							error instanceof Error
								? error.message
								: String(error),
						type: "debug-ingest-error",
					});
				}
				return new Response(null, { status: 204 });
			}
			return new Response(fixtureHtml, {
				headers: { "content-type": "text/html; charset=utf-8" },
			});
		},
		hostname: "127.0.0.1",
		port,
	});
	return {
		stop: () => server.stop(true),
		url: server.url.toString(),
	};
};

// Opening title-card narration. Plays first, over the intro slate, before any
// sign-in — so the branded intro is the literal start of the demo.
const INTRO_NARRATION =
	"A quick automated walkthrough — sign-in, the revenue workflow, and a real Discord handoff.";
// Narration for the two opening sign-ins. Rendered like any other beat and
// placed in the composed audio at the measured moment each sign-in begins.
const OWN_SITE_NARRATION =
	"First it signs in to your own product, typing real credentials like a user.";
const THIRD_PARTY_NARRATION =
	"Then a third-party app it doesn't own — driving that site's real login.";
// Silence held between consecutive prelude narrations so they never overlap.
const PRELUDE_GAP_MS = 350;
// Inline mode only: bridges the walkthrough into the real Discord voice scene,
// where the AI agents talk amongst themselves in an actual Discord call.
const DISCORD_NARRATION =
	"When the work needs a real app, the demo drives it directly — opening Discord and joining a voice channel, where the AI agents talk through the Caldera plan amongst themselves. A real call, captured live.";
// Inline only: closing card narration over the branded completion slate.
const OUTRO_NARRATION =
	"That's the workflow — real sign-ins, a guided product tour, and AI agents collaborating in a live call, all captured in one pass.";

const addArtifact = (report: DemoRunReport, artifact: DemoArtifact | void) => {
	if (!artifact) return report;
	return {
		...report,
		artifacts: [...report.artifacts, artifact],
	};
};

type BrowserTimelineVisualKind = "box" | "circle" | "highlight" | "spotlight";

type BrowserTimelineVisual = {
	beatId?: string;
	color?: string;
	durationMs: number;
	id: string;
	kind?: BrowserTimelineVisualKind;
	label: string;
	selector: string;
	startMs: number;
};

type BrowserTimelineAction = {
	atMs: number;
	beatId?: string;
	id: string;
	selector: string;
	type: "click" | "fill" | "hide" | "show" | "tab";
	value?: string;
};

type BrowserTimeline = {
	actions: BrowserTimelineAction[];
	beats: { id: string; selector?: string; startMs: number; text: string }[];
	durationMs: number;
	referenceEpochMs?: number;
	visuals: BrowserTimelineVisual[];
};

type BrowserTimelineDriverEvent =
	| BrowserTimelineAction
	| {
			atMs: number;
			beatId: string;
			id: string;
			selector?: string;
			text: string;
			type: "beat";
	  }
	| ({ atMs: number; type: "visual" } & BrowserTimelineVisual)
	| {
			atMs: number;
			beatId?: string;
			id: string;
			type: "clear" | "timeline-complete";
	  };

type DemoBeatVisual = {
	color?: string;
	durationMs: number;
	id: string;
	kind: BrowserTimelineVisualKind;
	label: string;
	offsetMs?: number;
	selector: string;
};

type DemoBeatAction = {
	atOffsetMs: number;
	selector: string;
	type: BrowserTimelineAction["type"];
	value?: string;
};

type DemoBeat = {
	actions?: readonly DemoBeatAction[];
	focusSelector?: string;
	id: string;
	text: string;
	visuals: readonly DemoBeatVisual[];
};

const isVisualKind = (value: unknown): value is BrowserTimelineVisualKind =>
	value === "box" ||
	value === "circle" ||
	value === "highlight" ||
	value === "spotlight";

const playSyncedTimelineScript = String.raw`(timeline) => {
	const debugEvents = [];
	window.__absoluteDemoDebugEvents = debugEvents;
	const record = (event) => {
		const elapsedMs = timeline.referenceEpochMs
			? Date.now() - timeline.referenceEpochMs
			: performance.now();
		const entry = {
			...event,
			at: new Date().toISOString(),
			elapsedMs: Math.round(elapsedMs)
		};
		debugEvents.push(entry);
		if (debugBody) {
			debugBody.textContent = debugEvents
				.slice(-6)
				.map((item) =>
					(
						item.elapsedMs +
						"ms " +
						item.type +
						" " +
						(item.id ?? "") +
						" " +
						(item.status ?? "")
					).trim()
				)
				.join("\n");
		}
		if (debugBeat && event.beatId) debugBeat.textContent = "Beat: " + event.beatId;
		if (debugClock) debugClock.textContent = Math.max(0, Math.round(elapsedMs / 100) / 10).toFixed(1) + "s / " + (timeline.durationMs / 1000).toFixed(1) + "s";
	};
	const debugRoot = document.createElement("div");
	const debugBeat = document.createElement("div");
	const debugClock = document.createElement("div");
	const debugBody = document.createElement("pre");
	debugRoot.style.cssText = [
		"position:fixed",
		"right:12px",
		"bottom:12px",
		"z-index:2147483647",
		"width:360px",
		"max-width:calc(100vw - 24px)",
		"background:rgba(2,6,23,.88)",
		"color:#e2e8f0",
		"border:1px solid rgba(148,163,184,.45)",
		"border-radius:8px",
		"box-shadow:0 14px 36px rgba(2,6,23,.3)",
		"font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace",
		"padding:10px",
		"pointer-events:none"
	].join(";");
	debugBeat.style.cssText = "color:#5eead4;font-weight:800;margin-bottom:2px";
	debugClock.style.cssText = "color:#facc15;font-weight:800;margin-bottom:6px";
	debugBody.style.cssText = "margin:0;white-space:pre-wrap;color:#cbd5e1";
	debugBeat.textContent = "Beat: pending";
	debugClock.textContent = "0.0s / " + (timeline.durationMs / 1000).toFixed(1) + "s";
	debugRoot.append(debugBeat, debugClock, debugBody);
	// The debug HUD is a dev aid; only show it when asked (off for polished
	// renders). record() guards on these nodes, so leaving it detached is fine.
	if (timeline.showDebugOverlay) document.body.append(debugRoot);
	const cursor = document.querySelector("[data-demo='cursor']");
	const overlay = document.createElement("div");
	const label = document.createElement("div");
	overlay.style.cssText = [
		"position:fixed",
		"z-index:2147483647",
		"pointer-events:none",
		"opacity:0",
		"transform:scale(.98)",
		"transition:opacity 180ms ease,transform 220ms ease,left 220ms ease,top 220ms ease,width 220ms ease,height 220ms ease,border-radius 220ms ease"
	].join(";");
	label.style.cssText = [
		"position:fixed",
		"z-index:2147483647",
		"pointer-events:none",
		"background:#111827",
		"color:white",
		"font:700 15px/1.2 Inter,ui-sans-serif,system-ui,sans-serif",
		"border-radius:8px",
		"padding:9px 11px",
		"opacity:0",
		"transition:opacity 180ms ease,left 220ms ease,top 220ms ease"
	].join(";");
	document.body.append(overlay, label);
	const delayFor = (atMs) =>
		timeline.referenceEpochMs
			? Math.max(0, timeline.referenceEpochMs + atMs - Date.now())
			: Math.max(0, atMs);
	const schedule = (atMs, fn) => setTimeout(fn, delayFor(atMs));
	const activateTab = (name) => {
		document.querySelector("[data-tab='" + name + "']")?.click();
	};
	const describeTarget = (target, selector) => {
		const rect = target.getBoundingClientRect();
		const style = window.getComputedStyle(target);
		const panel = target.closest("[data-panel]");
		const opacity = Number.parseFloat(style.opacity || "1");
		const visible =
			rect.width >= 6 &&
			rect.height >= 6 &&
			style.display !== "none" &&
			style.visibility !== "hidden" &&
			(Number.isNaN(opacity) || opacity > 0.05);
		return {
			display: style.display,
			height: Math.round(rect.height),
			left: Math.round(rect.left),
			matchCount: document.querySelectorAll(selector).length,
			opacity: Number.isNaN(opacity) ? style.opacity : Math.round(opacity * 100) / 100,
			panel: panel?.getAttribute("data-panel"),
			panelActive: panel ? panel.classList.contains("active") : undefined,
			top: Math.round(rect.top),
			visibility: style.visibility,
			visible,
			width: Math.round(rect.width)
		};
	};
	const moveCursorTo = (target, offsetX = 0, offsetY = 0) => {
		if (!cursor || !target) return;
		const rect = target.getBoundingClientRect();
		const x = Math.min(window.innerWidth - 18, Math.max(18, rect.left + rect.width / 2 + offsetX));
		const y = Math.min(window.innerHeight - 18, Math.max(18, rect.top + rect.height / 2 + offsetY));
		cursor.style.left = x + "px";
		cursor.style.top = y + "px";
	};
	const pulseCursor = () => {
		if (!cursor) return;
		cursor.classList.add("clicking");
		setTimeout(() => cursor.classList.remove("clicking"), 190);
	};
	const place = (visual, attempt = 0) => {
		const target = document.querySelector(visual.selector);
		if (!target) {
			if (attempt < 8) {
				setTimeout(() => place(visual, attempt + 1), 125);
				return;
			}
			clear();
			record({ type: "visual", id: visual.id, beatId: visual.beatId, selector: visual.selector, status: "missing", attempts: attempt + 1 });
			return;
		}
		const targetState = describeTarget(target, visual.selector);
		if (!targetState.visible) {
			if (attempt < 8) {
				record({ type: "visual", id: visual.id, beatId: visual.beatId, selector: visual.selector, status: "waiting-for-visible", attempt: attempt + 1, target: targetState });
				setTimeout(() => place(visual, attempt + 1), 125);
				return;
			}
			clear();
			record({ type: "visual", id: visual.id, beatId: visual.beatId, selector: visual.selector, status: "skipped-hidden", attempts: attempt + 1, target: targetState });
			return;
		}
		moveCursorTo(target, Math.min(24, target.getBoundingClientRect().width / 3), -8);
		const rect = target.getBoundingClientRect();
		const pad = 10;
		const color = visual.color ?? "#14b8a6";
		const kind = visual.kind ?? "spotlight";
		const left = Math.max(10, rect.left - pad);
		const top = Math.max(10, rect.top - pad);
		const width = Math.min(window.innerWidth - left - 10, rect.width + pad * 2);
		const height = Math.min(window.innerHeight - top - 10, rect.height + pad * 2);
		overlay.style.left = left + "px";
		overlay.style.top = top + "px";
		overlay.style.width = width + "px";
		overlay.style.height = height + "px";
		overlay.style.border = kind === "highlight" ? "3px solid " + color : "5px solid " + color;
		overlay.style.borderRadius = kind === "circle" ? "999px" : "12px";
		overlay.style.background = kind === "highlight" ? "rgba(20,184,166,.18)" : "transparent";
		overlay.style.boxShadow = kind === "spotlight"
			? "0 0 0 9999px rgba(15,23,42,.34),0 18px 40px rgba(15,23,42,.24)"
			: "0 0 0 3px rgba(255,255,255,.82),0 14px 32px rgba(15,23,42,.22)";
		label.textContent = visual.label;
		label.style.left = left + "px";
		label.style.top = Math.max(10, top - 42) + "px";
		label.style.background = color;
		overlay.style.opacity = "1";
		overlay.style.transform = "scale(1)";
		label.style.opacity = "1";
		record({ type: "visual", id: visual.id, beatId: visual.beatId, selector: visual.selector, status: "shown", kind, attempts: attempt + 1, target: targetState });
	};
	const clear = () => {
		overlay.style.opacity = "0";
		overlay.style.transform = "scale(.98)";
		label.style.opacity = "0";
	};
	const runEvent = (event) => {
		if (event.type === "beat") {
			record({ type: "beat", id: event.id, beatId: event.beatId, status: "started", text: event.text });
			if (event.selector) {
				const target = document.querySelector(event.selector);
				if (target) moveCursorTo(target, 18, -6);
			}
			return;
		}
		if (event.type === "visual") {
			place(event);
			return;
		}
		if (event.type === "clear") {
			clear();
			record({ type: "visual-clear", id: event.id, beatId: event.beatId, status: "done" });
			return;
		}
		if (event.type === "timeline-complete") {
			record({ type: "timeline", id: event.id, status: "complete" });
			clear();
			return;
		}
		if (
			event.type === "click" ||
			event.type === "fill" ||
			event.type === "hide" ||
			event.type === "show" ||
			event.type === "tab"
		) {
			const target = document.querySelector(event.selector);
			if (!target) {
				record({ type: "action", id: event.id, beatId: event.beatId, selector: event.selector, status: "missing", actionType: event.type });
				return;
			}
			moveCursorTo(target);
			record({ type: "action", id: event.id, beatId: event.beatId, selector: event.selector, status: "aiming", actionType: event.type, value: event.value });
			setTimeout(() => {
				if (event.type === "fill") {
					target.focus?.();
					target.value = event.value ?? "";
					target.dispatchEvent(new InputEvent("input", { bubbles: true, data: event.value ?? "" }));
					target.dispatchEvent(new Event("change", { bubbles: true }));
				} else if (event.type === "click") {
					pulseCursor();
					target.click?.();
			} else if (event.type === "show") {
				target.style.display = target.classList.contains("exit-slate")
					? "flex"
					: "block";
				target.classList.remove("hidden");
				} else if (event.type === "hide") {
					pulseCursor();
					target.classList.add("hidden");
					setTimeout(() => {
						target.style.display = "none";
					}, 360);
				} else if (event.type === "tab") {
					pulseCursor();
					activateTab(event.value);
				}
				record({ type: "action", id: event.id, beatId: event.beatId, selector: event.selector, status: "done", actionType: event.type, value: event.value });
			}, 650);
		}
	};
	window.__absoluteDemoRunEvent = runEvent;
	if (timeline.scheduleInBrowser) {
		for (const beat of timeline.beats) {
			schedule(beat.startMs, () => runEvent({ atMs: beat.startMs, beatId: beat.id, id: beat.id, text: beat.text, type: "beat" }));
		}
		for (const action of timeline.actions) {
			schedule(action.atMs, () => runEvent(action));
		}
		for (const visual of timeline.visuals) {
			schedule(visual.startMs, () => runEvent({ ...visual, atMs: visual.startMs, type: "visual" }));
			schedule(visual.startMs + visual.durationMs, () => runEvent({ atMs: visual.startMs + visual.durationMs, beatId: visual.beatId, id: visual.id + "-clear", type: "clear" }));
		}
		schedule(timeline.durationMs, () => runEvent({ atMs: timeline.durationMs, id: "timeline-complete", type: "timeline-complete" }));
	}
	record({
		type: "timeline",
		id: "timeline-ready",
		status: timeline.scheduleInBrowser ? "scheduled" : "ready",
		actionCount: timeline.actions.length,
		beatCount: timeline.beats.length,
		referenceEpochMs: timeline.referenceEpochMs,
		visualCount: timeline.visuals.length
	});
	return { scheduledMs: timeline.durationMs, debugEventCount: debugEvents.length };
}`;

await rm(runDir, { force: true, recursive: true });
await Promise.all([
	mkdir(artifactDir, { recursive: true }),
	mkdir(videoDir, { recursive: true }),
	mkdir(screenshotDir, { recursive: true }),
]);
await loadVoiceAndAiEnv();
if (!process.env.ELEVENLABS_API_KEY) {
	throw new Error(
		"ELEVENLABS_API_KEY is required for the upgraded demo voiceover. Set it directly or via DEMO_ENV_FILE.",
	);
}
// The demo opens with two real sign-ins (your own site, then a third party).
// Credentials are required and passed to the profiles as env *references* —
// values never enter the script, manifest, or recording. No silent defaults.
const SIGN_IN_ENV = [
	"OWN_SITE_EMAIL",
	"OWN_SITE_PASSWORD",
	"SAUCE_USERNAME",
	"SAUCE_PASSWORD",
];
const missingSignInEnv = SIGN_IN_ENV.filter((name) => !process.env[name]);
if (missingSignInEnv.length > 0) {
	throw new Error(
		`Missing required sign-in env vars: ${missingSignInEnv.join(", ")}. ` +
			"Set them before running (export, or use a .env). Own-site values can " +
			"be anything (the fixture accepts them); for the third party, " +
			"saucedemo.com's public login is standard_user / secret_sauce.",
	);
}

const fixture =
	process.env.DEMO_TARGET_URL === undefined
		? await startFixture()
		: undefined;
const targetUrl = process.env.DEMO_TARGET_URL ?? fixture!.url;

// Sign-in profile 1 — your own site. Drives the fixture's real login form
// (open the auth tab, type email + password, submit, confirm authenticated).
const ownSiteProfile: DemoCredentialProfile = {
	fields: [
		{
			selector: "[data-demo='auth-email']",
			typeDelayMs: 55,
			value: { env: "OWN_SITE_EMAIL" },
		},
		{
			selector: "[data-demo='auth-password']",
			typeDelayMs: 55,
			value: { env: "OWN_SITE_PASSWORD" },
		},
	],
	id: "own-site",
	kind: "form",
	// No loginUrl: the prelude navigates to the fixture and dismisses its intro
	// overlay first (the overlay would otherwise intercept these clicks).
	steps: [
		{ action: "click", selector: "[data-demo='tab-auth']" },
		{ action: "waitFor", target: 400 },
	],
	submitSelector: "[data-demo='auth-login']",
	success: { selector: "[data-demo='auth-ready']" },
};

// Sign-in profile 2 — a third party we don't control (saucedemo.com). Same
// form driver, a site whose code we don't own.
const thirdPartyProfile: DemoCredentialProfile = {
	fields: [
		{ selector: "#user-name", typeDelayMs: 55, value: { env: "SAUCE_USERNAME" } },
		{ selector: "#password", typeDelayMs: 55, value: { env: "SAUCE_PASSWORD" } },
	],
	id: "third-party",
	kind: "form",
	loginUrl: "https://www.saucedemo.com/",
	submitSelector: "#login-button",
	success: { selector: ".inventory_list" },
};
// Upgraded voiceover stack: premium ElevenLabs (Rachel, eleven_flash_v2_5,
// tuned settings) -> demo-vocabulary pronunciation fixes applied before TTS ->
// cross-run render cache so unchanged beats are not re-synthesized. The cache
// lives outside runDir (which is wiped each run) so it survives between runs.
const voiceCacheDir = `${outputRoot}/.voice-cache`;
await mkdir(voiceCacheDir, { recursive: true });
// Built-in content-addressed cache: audio is re-generated only when the request
// hash (voice + model + format + settings + text) changes, so unchanged
// narration is never re-billed. The cache lives outside runDir (which is wiped
// each run) so it persists across runs. Pronunciation aliasing runs first, so
// the cache keys on the exact text sent to ElevenLabs.
const voiceover = withPronunciationAliases(
	createElevenLabsVoiceover({
		apiKey: process.env.ELEVENLABS_API_KEY,
		cacheDir: voiceCacheDir,
		filePrefix: `${runSlug}-elevenlabs`,
		outputDir: artifactDir,
	}),
);

// NOTE: the intro/title card is no longer a timeline beat — it plays first in
// the sign-in prelude (see INTRO_NARRATION) so the branded intro is the literal
// start of the demo. The product timeline below begins with the auth beat.
const BASE_BEATS: readonly DemoBeat[] = [
	{
		actions: [
			{
				atOffsetMs: 900,
				selector: "[data-demo='tab-auth']",
				type: "click",
			},
			{
				atOffsetMs: 2300,
				selector: "[data-demo='auth-email']",
				type: "fill",
				value: "demo@absolutejs.com",
			},
			{
				atOffsetMs: 3900,
				selector: "[data-demo='auth-workspace']",
				type: "fill",
				value: "Revenue Command",
			},
			{
				atOffsetMs: 5600,
				selector: "[data-demo='auth-login']",
				type: "click",
			},
		],
		focusSelector: "[data-demo='tab-auth']",
		id: "auth",
		text: "First, the runner selects an account, enters the workspace context, and confirms the user is authenticated before the demo continues.",
		visuals: [
			{
				durationMs: 1600,
				id: "auth-email",
				kind: "box",
				label: "Demo account",
				offsetMs: 2100,
				selector: "[data-demo='auth-email-wrap']",
			},
			{
				color: "#22c55e",
				durationMs: 1800,
				id: "auth-ready",
				kind: "highlight",
				label: "Authenticated",
				offsetMs: 6700,
				selector: "[data-demo='auth-ready']",
			},
		],
	},
	{
		focusSelector: "[data-demo='workspace']",
		id: "dashboard",
		text: "After sign in, the dashboard opens with pipeline, risk, next actions, and forecast visible together.",
		visuals: [
			{
				durationMs: 1800,
				id: "dashboard-pipeline-total",
				kind: "box",
				label: "Open pipeline",
				offsetMs: 500,
				selector: "[data-demo='pipeline-total']",
			},
			{
				durationMs: 1700,
				id: "dashboard-forecast",
				kind: "circle",
				label: "Commit forecast",
				offsetMs: 2500,
				selector: "[data-demo='forecast']",
			},
		],
	},
	{
		actions: [
			{
				atOffsetMs: 1600,
				selector: "[data-demo='tab-risk']",
				type: "click",
			},
		],
		focusSelector: "[data-demo='tab-risk']",
		id: "risk-review",
		text: "Next, the cursor moves into risk review so the audience can see exactly why the Caldera deal is slipping.",
		visuals: [
			{
				color: "#ef4444",
				durationMs: 1600,
				id: "risk-count",
				kind: "circle",
				label: "Seven at risk",
				offsetMs: 500,
				selector: "[data-demo='risk-score']",
			},
			{
				color: "#f97316",
				durationMs: 2200,
				id: "risk-signal",
				kind: "highlight",
				label: "Procurement silence",
				offsetMs: 3100,
				selector: "[data-demo='risk-signal-1']",
			},
		],
	},
	{
		actions: [
			{
				atOffsetMs: 1500,
				selector: "[data-demo='ai-triage']",
				type: "click",
			},
		],
		focusSelector: "[data-demo='ai-triage']",
		id: "triage",
		text: "Now AI triage runs against the account data, updates the workspace, and lowers the active risk count.",
		visuals: [
			{
				durationMs: 1500,
				id: "triage-button",
				kind: "box",
				label: "Run AI triage",
				offsetMs: 500,
				selector: "[data-demo='ai-triage']",
			},
			{
				color: "#22c55e",
				durationMs: 2000,
				id: "triage-result",
				kind: "highlight",
				label: "Risk reduced",
				offsetMs: 3000,
				selector: "[data-demo='risk-score']",
			},
		],
	},
	{
		actions: [
			{
				atOffsetMs: 1000,
				selector: "[data-demo='tab-pipeline']",
				type: "click",
			},
			{
				atOffsetMs: 2500,
				selector: "[data-demo='search']",
				type: "fill",
				value: "Caldera Health",
			},
		],
		focusSelector: "[data-demo='search-wrap']",
		id: "search",
		text: "Back in pipeline, the demo searches for Caldera Health and holds on the deal row long enough to inspect the next step.",
		visuals: [
			{
				durationMs: 1800,
				id: "search-box",
				kind: "box",
				label: "Search account",
				offsetMs: 2300,
				selector: "[data-demo='search-wrap']",
			},
			{
				color: "#f97316",
				durationMs: 2400,
				id: "caldera-row",
				kind: "spotlight",
				label: "Caldera Health",
				offsetMs: 4200,
				selector: "[data-demo='caldera-row']",
			},
		],
	},
	{
		actions: [
			{
				atOffsetMs: 1600,
				selector: "[data-demo='generate-plan']",
				type: "click",
			},
		],
		focusSelector: "[data-demo='generate-plan']",
		id: "plan",
		text: "The rescue plan is generated inside the workflow, showing sponsor outreach, pricing guardrails, and the CFO follow up.",
		visuals: [
			{
				durationMs: 1500,
				id: "generate-plan-button",
				kind: "box",
				label: "Generate plan",
				offsetMs: 600,
				selector: "[data-demo='generate-plan']",
			},
			{
				color: "#22c55e",
				durationMs: 2200,
				id: "plan-ready",
				kind: "highlight",
				label: "Plan ready",
				offsetMs: 3200,
				selector: "[data-demo='plan-ready']",
			},
			{
				color: "#0ea5e9",
				durationMs: 1800,
				id: "plan-step",
				kind: "box",
				label: "CFO follow-up",
				offsetMs: 5400,
				selector: "[data-demo='plan-step-3']",
			},
		],
	},
	{
		actions: [
			{
				atOffsetMs: 1100,
				selector: "[data-demo='tab-meet']",
				type: "click",
			},
			{
				atOffsetMs: 3300,
				selector: "[data-demo='meet-start']",
				type: "click",
			},
		],
		focusSelector: "[data-demo='tab-meet']",
		id: "meet",
		text: "The next section checks a Google Meet launch, including the selected account, calendar context, and active meeting tiles.",
		visuals: [
			{
				color: "#0ea5e9",
				durationMs: 1800,
				id: "meet-account",
				kind: "box",
				label: "Meeting account",
				offsetMs: 2300,
				selector: "[data-demo='meet-account']",
			},
			{
				color: "#22c55e",
				durationMs: 2400,
				id: "meet-frame",
				kind: "highlight",
				label: "Meet active",
				offsetMs: 4500,
				selector: "[data-demo='meet-frame']",
			},
		],
	},
	{
		actions: [
			{
				atOffsetMs: 1200,
				selector: "[data-demo='tab-discord']",
				type: "click",
			},
			{
				atOffsetMs: 3700,
				selector: "[data-demo='discord-post']",
				type: "click",
			},
		],
		focusSelector: "[data-demo='tab-discord']",
		id: "discord",
		text: "For desktop style automation, the flow switches to a Discord handoff and posts the summary into the revenue channel.",
		visuals: [
			{
				color: "#a78bfa",
				durationMs: 2200,
				id: "discord-shell",
				kind: "box",
				label: "Desktop handoff",
				offsetMs: 2400,
				selector: "[data-demo='discord-shell']",
			},
			{
				color: "#22c55e",
				durationMs: 2200,
				id: "discord-new-message",
				kind: "highlight",
				label: "Posted summary",
				offsetMs: 5000,
				selector: "[data-demo='discord-new-message']",
			},
		],
	},
	{
		actions: [
			{
				atOffsetMs: 900,
				selector: "[data-demo='tab-automation']",
				type: "click",
			},
			{
				atOffsetMs: 2900,
				selector: "[data-demo='draft-email']",
				type: "click",
			},
		],
		focusSelector: "[data-demo='tab-automation']",
		id: "automation",
		text: "Finally, automation drafts the sponsor email, leaving the seller with a ready to send follow up.",
		visuals: [
			{
				durationMs: 1600,
				id: "draft-email-button",
				kind: "box",
				label: "Draft email",
				offsetMs: 1900,
				selector: "[data-demo='draft-email']",
			},
			{
				color: "#22c55e",
				durationMs: 2600,
				id: "email-draft",
				kind: "highlight",
				label: "Ready to send",
				offsetMs: 4500,
				selector: "[data-demo='email-draft']",
			},
		],
	},
	{
		actions: [
			{
				atOffsetMs: 900,
				selector: "[data-demo='exit-slate']",
				type: "show",
			},
		],
		focusSelector: "[data-demo='exit-title']",
		id: "exit",
		text: "The demo ends on a completion screen, with all artifacts available for review and debugging.",
		visuals: [
			{
				color: "#14b8a6",
				durationMs: 3000,
				id: "exit-title",
				kind: "box",
				label: "Workflow complete",
				offsetMs: 1900,
				selector: "[data-demo='exit-title']",
			},
		],
	},
];
// Inline mode shows the REAL Discord app as its own phase, so drop the mocked
// Discord panel beat from the fixture timeline (the Meet panel stays until the
// live Zoom scene is enabled — see ZOOM-PRO-UPGRADE.md).
const beats: readonly DemoBeat[] = INLINE
	? BASE_BEATS.filter(
			(beat) => beat.id !== "discord" && beat.id !== "exit",
		)
	: BASE_BEATS;
const voiceArtifacts: Record<string, DemoArtifact | void> = {};
for (const beat of beats) {
	voiceArtifacts[beat.id] = await voiceover.speak({ text: beat.text });
}
const durationOf = (artifact: DemoArtifact) => {
	const durationMs = artifact.metadata?.durationMs;
	return typeof durationMs === "number" ? durationMs : 2500;
};
const requireArtifact = (
	artifact: DemoArtifact | void,
	label: string,
): DemoArtifact => {
	if (!artifact)
		throw new Error(`${label} voiceover did not produce an artifact`);
	return artifact;
};
const preludeVoice = {
	intro: requireArtifact(
		await voiceover.speak({ text: INTRO_NARRATION }),
		"intro",
	),
	ownSite: requireArtifact(
		await voiceover.speak({ text: OWN_SITE_NARRATION }),
		"own-site sign-in",
	),
	thirdParty: requireArtifact(
		await voiceover.speak({ text: THIRD_PARTY_NARRATION }),
		"third-party sign-in",
	),
	// Inline only: narration for the real Discord voice scene.
	discord:
		INLINE && DISCORD_SCENE
			? requireArtifact(
					await voiceover.speak({ text: DISCORD_NARRATION }),
					"discord scene",
				)
			: undefined,
	// Inline only: closing card narration.
	outro: INLINE
		? requireArtifact(
				await voiceover.speak({ text: OUTRO_NARRATION }),
				"outro",
			)
		: undefined,
};
// Replace each voiceover's estimated duration with the exact ffprobe value so
// beat pacing and audio placement are precise (no overlap/cutoff).
const allVoiceArtifacts = [
	...Object.values(voiceArtifacts),
	preludeVoice.intro,
	preludeVoice.ownSite,
	preludeVoice.thirdParty,
	...(preludeVoice.discord ? [preludeVoice.discord] : []),
	...(preludeVoice.outro ? [preludeVoice.outro] : []),
].filter((artifact): artifact is DemoArtifact => Boolean(artifact));
for (const artifact of allVoiceArtifacts) {
	const exact = await probeDurationMs(artifact.path);
	if (exact !== undefined) {
		artifact.metadata = { ...artifact.metadata, durationMs: exact };
	}
}
const plan = createDemoSyncPlan(runSlug);
let beatStartMs = 1000;
const actions: BrowserTimelineAction[] = [];
const beatStarts: Record<string, number> = {};
for (const beat of beats) {
	beatStarts[beat.id] = beatStartMs;
	const artifact = requireArtifact(voiceArtifacts[beat.id], beat.id);
	const voiceDurationMs = durationOf(artifact);
	plan.addVoiceover({
		artifact,
		durationMs: voiceDurationMs,
		id: `${beat.id}-voiceover`,
		startMs: beatStartMs,
		text: beat.text,
	});
	for (const visual of beat.visuals) {
		plan.addVisual({
			durationMs: visual.durationMs,
			id: visual.id,
			label: visual.label,
			metadata: {
				beatId: beat.id,
				color: visual.color,
				kind: visual.kind,
				selector: visual.selector,
			},
			startMs: beatStartMs + (visual.offsetMs ?? 0),
		});
	}
	for (const action of beat.actions ?? []) {
		actions.push({
			atMs: beatStartMs + action.atOffsetMs,
			beatId: beat.id,
			id: `${beat.id}-${action.type}-${action.atOffsetMs}`,
			selector: action.selector,
			type: action.type,
			...(action.value ? { value: action.value } : {}),
		});
	}
	const visualEndMs = Math.max(
		0,
		...beat.visuals.map(
			(visual) => (visual.offsetMs ?? 0) + visual.durationMs,
		),
	);
	beatStartMs += Math.max(voiceDurationMs, visualEndMs) + 400;
}
actions.push({
	atMs: Math.max(0, (beatStarts.auth ?? beatStartMs) - 700),
	beatId: "intro",
	id: "intro-hide-slate",
	selector: "[data-demo='intro-slate']",
	type: "hide",
});
const voiceoverOffsetsMs = Object.fromEntries(
	plan.items
		.filter((item) => item.type === "voiceover")
		.map((item) => [item.artifact.id, item.startMs]),
);
const tailPadMs = 1000;
const outputDurationMs = plan.durationMs + tailPadMs;
const browserTimeline: BrowserTimeline = {
	actions,
	beats: beats.map((beat) => ({
		id: beat.id,
		...(beat.focusSelector ? { selector: beat.focusSelector } : {}),
		startMs: beatStarts[beat.id] ?? 0,
		text: beat.text,
	})),
	durationMs: outputDurationMs,
	visuals: plan.items
		.filter((item) => item.type === "visual")
		.flatMap((item) => {
			const selector = item.metadata?.selector;
			if (typeof selector !== "string") return [];
			return [
				{
					...(typeof item.metadata?.beatId === "string"
						? { beatId: item.metadata.beatId }
						: {}),
					...(typeof item.metadata?.color === "string"
						? { color: item.metadata.color }
						: {}),
					durationMs: item.durationMs,
					id: item.id,
					...(isVisualKind(item.metadata?.kind)
						? { kind: item.metadata.kind }
						: {}),
					label: item.label,
					selector,
					startMs: item.startMs,
				},
			];
		}),
};
const browserTimelineDriverEvents: BrowserTimelineDriverEvent[] = [
	...browserTimeline.beats.map((beat) => ({
		atMs: beat.startMs,
		beatId: beat.id,
		id: beat.id,
		...(beat.selector ? { selector: beat.selector } : {}),
		text: beat.text,
		type: "beat" as const,
	})),
	...browserTimeline.actions,
	...browserTimeline.visuals.flatMap((visual) => [
		{
			...visual,
			atMs: visual.startMs,
			type: "visual" as const,
		},
		{
			atMs: visual.startMs + visual.durationMs,
			...(visual.beatId ? { beatId: visual.beatId } : {}),
			id: `${visual.id}-clear`,
			type: "clear" as const,
		},
	]),
	{
		atMs: browserTimeline.durationMs,
		id: "timeline-complete",
		type: "timeline-complete" as const,
	},
].sort((left, right) => left.atMs - right.atMs);
const timelinePlanPath = `${artifactDir}/${runSlug}.timeline-plan.json`;
await writeFile(
	timelinePlanPath,
	JSON.stringify(
		{
			driverEvents: browserTimelineDriverEvents,
			outputDurationMs,
			runSlug,
			timeline: browserTimeline,
			voiceoverOffsetsMs,
		},
		null,
		2,
	),
);
// Inline-real Discord channel ids (from the gitignored .discord-bots.env).
const discordIds = INLINE
	? await (async () => {
			const ids: Record<string, string> = {};
			try {
				const text = await readFile(
					`${process.cwd()}/.discord-bots.env`,
					"utf8",
				);
				for (const line of text.split(/\r?\n/)) {
					const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
					if (match) ids[match[1]] = match[2].replace(/^["']|["']$/g, "");
				}
			} catch {
				/* surfaced below if missing */
			}
			return ids;
		})()
	: {};

// Two recording paths. Default: Playwright records its own page (silent), and
// voiceover is overlaid at compose time. Inline: run the walkthrough in the
// user's signed-in Chrome over CDP and capture the whole desktop (x11grab +
// RDPSink.monitor playback audio) so the real Discord voices land in the track.
let session: Awaited<ReturnType<typeof createPlaywrightDemoSession>> | undefined;
let inlineBrowser:
	| Awaited<ReturnType<typeof import("./cdp-browser").createCdpDemoBrowser>>
	| undefined;
let inlineRecorder: ReturnType<typeof createScreenRecorder> | undefined;
let browserDriver;
let videoEpochMs: number;

if (INLINE) {
	const cdpUrl = await resolveCdpUrl();
	const { createCdpDemoBrowser } = await import("./cdp-browser");
	inlineBrowser = await createCdpDemoBrowser({
		cdpUrl,
		createTab: true,
		maximize: true,
		screenshotDir,
		startUrl: targetUrl,
	});
	browserDriver = inlineBrowser.driver;
	// WSLg's X root (:0) is black under rootless XWayland, so grab the Chrome
	// window itself. Give the maximize a beat to settle, then resolve the window
	// id via xwininfo (largest Chrome window, or DEMO_CHROME_WINDOW_MATCH).
	await new Promise((resolve) => setTimeout(resolve, 800));
	const windowId = await resolveChromeWindowId(
		process.env.DEMO_CHROME_WINDOW_MATCH,
	);
	if (!windowId) {
		throw new Error(
			"Inline capture could not find the Chrome window (xwininfo). " +
				"Is the debug Chrome visible on the X display?",
		);
	}
	// Crop the browser chrome (tabs + address bar) out of the capture, keeping
	// just the page viewport. The toolbar height in device px is
	// (outerHeight - innerHeight) * dpr; the grab's origin is the window top.
	// DEMO_NO_CROP=true keeps the full window if you want the browser framing.
	const cropRect = await (async () => {
		if (
			process.env.DEMO_NO_CROP === "1" ||
			process.env.DEMO_NO_CROP?.toLowerCase() === "true"
		) {
			return undefined;
		}
		const metrics = await inlineBrowser!
			.evaluate<{ iw: number; ih: number; oh: number; dpr: number }>(
				"() => ({ iw: window.innerWidth, ih: window.innerHeight, oh: window.outerHeight, dpr: window.devicePixelRatio || 1 })",
			)
			.catch(() => undefined);
		if (!metrics || metrics.ih <= 0) return undefined;
		const top = Math.max(0, Math.round((metrics.oh - metrics.ih) * metrics.dpr));
		return {
			height: Math.round(metrics.ih * metrics.dpr),
			width: Math.round(metrics.iw * metrics.dpr),
			x: 0,
			y: top,
		};
	})();
	inlineRecorder = createScreenRecorder({
		// Video-only: WSLg Pulse capture blocks on an idle sink. Audio (narration
		// + the Discord bots' real TTS) is muxed deterministically at compose.
		...(cropRect ? { cropRect } : {}),
		display: process.env.DISPLAY ?? ":0",
		framerate: 30,
		outputPath: `${videoDir}/${runSlug}.mp4`,
		windowId,
	});
	// Start the desktop capture, then let x11grab spin up before fixing t=0 so
	// composed-audio offsets line up with what's actually on screen.
	await inlineRecorder.start({
		id: runSlug,
		startedAt: new Date(),
	} as Parameters<typeof inlineRecorder.start>[0]);
	await new Promise((resolve) => setTimeout(resolve, 1500));
	videoEpochMs = Date.now();
} else {
	session = await createPlaywrightDemoSession({
		channel: process.env.DEMO_BROWSER_CHANNEL ?? "chrome",
		headless: envFlag("DEMO_HEADLESS", false),
		recordVideoDir: videoDir,
		screenshotDir,
	});
	// The Playwright video starts recording when the context/page is created
	// (above), so this is video time t=0. Every composed-audio offset is
	// measured against this single anchor — not run.startedAt — so audio lines
	// up with the recording precisely.
	videoEpochMs = Date.now();
	browserDriver = session.browserDriver;
}

const runner = createDemoRunner({
	annotationFailure: "continue",
	// Inline draws its callouts via the in-page timeline overlay, not Playwright
	// annotations, so the annotation driver is only wired for the Playwright path.
	...(session ? { annotations: session.annotations } : {}),
	auth: createDemoAuthDriver(),
	browser: browserDriver,
});

// Mutable timing captured during the run: when the product timeline actually
// starts (after the variable-length sign-in prelude) and where each prelude
// narration lands in the recording. Used to keep audio synced at compose time.
const timing = {
	preludeOffsetsMs: {} as Record<string, number>,
	timelineEpochMs: 0,
};
const durationOfMs = (artifact: DemoArtifact) => durationOf(artifact);
// Play one narration starting now (placed in the composed audio at this video
// offset), run an optional on-screen action, then hold so the screen stays for
// the rest of the narration — keeping each clip in its own non-overlapping slot.
const playNarration = async (
	browser: { waitFor: (target: string | number) => Promise<void> } | undefined,
	addArtifact: (artifact: DemoArtifact | void) => void,
	artifact: DemoArtifact,
	action?: () => Promise<void>,
) => {
	const startWall = Date.now();
	timing.preludeOffsetsMs[artifact.id] = Math.max(0, startWall - videoEpochMs);
	addArtifact(artifact);
	if (action) await action();
	const elapsed = Date.now() - startWall;
	// Hold for the FULL narration so consecutive prelude lines can't overlap in
	// the composed audio. Use the max of the metadata duration and a fresh probe
	// (whichever is longer — metadata can lag, the file can be missing), plus a
	// gap. This is what keeps the timeline from starting before the prelude ends.
	const probedMs = await probeDurationMs(artifact.path);
	const exactMs = Math.max(durationOfMs(artifact), probedMs ?? 0);
	const hold = Math.max(900, exactMs - elapsed) + PRELUDE_GAP_MS;
	await browser?.waitFor(hold);
};

let report = await runner.run({
	profiles: [ownSiteProfile, thirdPartyProfile],
	id: runSlug,
	metadata: {
		environment: process.env.DEMO_ENVIRONMENT ?? "local",
		product: "Absolute demo fixture",
		runStamp,
	},
	steps: [
		{
			name: "intro and sign-in prelude",
			run: async ({ addArtifact, browser, signIn }) => {
				await browser?.goto(targetUrl);
				// 1) Title card first: show the intro slate while its narration
				//    plays, so the branded intro is the literal start.
				await playNarration(browser, addArtifact, preludeVoice.intro);
				// Dismiss the intro overlay so it can't intercept login clicks.
				await browser?.evaluate?.(
					"() => { const s = document.querySelector(\"[data-demo='intro-slate']\"); if (s) { s.classList.add('hidden'); s.style.display = 'none'; } }",
				);
				// 2) Sign in to your own site (the fixture's real login form).
				await playNarration(
					browser,
					addArtifact,
					preludeVoice.ownSite,
					() => signIn("own-site"),
				);
				// 3) Sign in to a third party we don't control (saucedemo.com).
				await playNarration(
					browser,
					addArtifact,
					preludeVoice.thirdParty,
					() => signIn("third-party"),
				);
			},
		},
		goto(targetUrl),
		wait(500),
		{
			name: "play synced visual timeline",
			run: async ({ addArtifact, browser, run }) => {
				if (!browser?.evaluate) {
					throw new Error(
						"Demo browser evaluate support is required",
					);
				}
				if (!browser.waitFor) {
					throw new Error("Demo browser waitFor support is required");
				}
				// The product timeline's clock starts NOW — after the
				// variable-length sign-in prelude — not at run start, so its
				// scheduled visuals/actions stay aligned with its voiceover.
				timing.timelineEpochMs = Date.now();
				const nodeDebugEvents: unknown[] = [];
				const writeTimelineDebug = async (
					debugEvents: unknown,
					collectionError?: string,
				) => {
					const debugPath = `${artifactDir}/${runSlug}.timeline-debug.json`;
					await writeFile(
						debugPath,
						JSON.stringify(
							{
								collectionError,
								events: debugEvents,
								nodeEvents: nodeDebugEvents,
								outputDurationMs,
								referenceEpochMs: run.startedAt.getTime(),
								runId: run.id,
								runStartedAt: run.startedAt.toISOString(),
								timeline: browserTimeline,
							},
							null,
							2,
						),
					);
					addArtifact({
						id: `${runSlug}-timeline-debug`,
						kind: "log",
						metadata: {
							eventCount: Array.isArray(debugEvents)
								? debugEvents.length
								: undefined,
							nodeEventCount: nodeDebugEvents.length,
							outputDurationMs,
							source: "browser-timeline",
						},
						path: debugPath,
					});
				};
				try {
					await browser.evaluate(playSyncedTimelineScript, {
						...browserTimeline,
						referenceEpochMs: timing.timelineEpochMs,
						showDebugOverlay: DEBUG_OVERLAY,
					});
					nodeDebugEvents.push({
						at: new Date().toISOString(),
						elapsedMs: Date.now() - run.startedAt.getTime(),
						id: "timeline-installed",
						status: "done",
						type: "driver",
					});
					for (const event of browserTimelineDriverEvents) {
						await browser.waitFor(
							Math.max(
								0,
								timing.timelineEpochMs +
									event.atMs -
									Date.now(),
							),
						);
						nodeDebugEvents.push({
							at: new Date().toISOString(),
							elapsedMs: Date.now() - run.startedAt.getTime(),
							event,
							id: event.id,
							status: "dispatching",
							type: "driver",
						});
						await browser.evaluate(
							"(event) => window.__absoluteDemoRunEvent?.(event)",
							event,
						);
						nodeDebugEvents.push({
							at: new Date().toISOString(),
							elapsedMs: Date.now() - run.startedAt.getTime(),
							id: event.id,
							status: "done",
							type: "driver",
						});
					}
					await browser.waitFor(
						Math.max(
							0,
							timing.timelineEpochMs +
								outputDurationMs +
								500 -
								Date.now(),
						),
					);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					nodeDebugEvents.push({
						at: new Date().toISOString(),
						elapsedMs: Date.now() - run.startedAt.getTime(),
						error: message,
						status: "failed",
						type: "driver",
					});
					await writeTimelineDebug([...fixtureDebugEvents], message);
					throw error;
				}
				let debugEvents: unknown = [...fixtureDebugEvents];
				let collectionError: string | undefined;
				try {
					const browserDebugEvents = await browser.evaluate<unknown>(
						"() => window.__absoluteDemoDebugEvents ?? []",
					);
					if (
						Array.isArray(browserDebugEvents) &&
						browserDebugEvents.length > 0
					) {
						debugEvents = browserDebugEvents;
					}
				} catch (error) {
					collectionError =
						error instanceof Error ? error.message : String(error);
				}
				try {
					addArtifact(
						await browser.screenshot?.(`${runSlug}-timeline-final`),
					);
				} catch (error) {
					collectionError = [
						collectionError,
						error instanceof Error ? error.message : String(error),
					]
						.filter(Boolean)
						.join("; ");
				}
				await writeTimelineDebug(debugEvents, collectionError);
			},
		},
		// Inline-real: after the product walkthrough, drive the user's Chrome into
		// the REAL Discord app, join voice, and let the AI agents talk amongst
		// themselves. Their voices are captured live (RDPSink.monitor); the
		// narration is placed at this phase's video offset at compose time.
		...(INLINE && DISCORD_SCENE
			? [
					{
						name: "real discord voice scene",
						run: async ({
							addArtifact,
							browser,
						}: {
							addArtifact: (artifact: DemoArtifact | void) => void;
							browser?: {
								goto: (url: string) => Promise<void>;
								waitFor: (target: string | number) => Promise<void>;
							};
						}) => {
							const { openDiscordVoice, leaveDiscordVoice } =
								await import("./scene-discord-view");
							const { runDiscordScene } = await import(
								"./discord-scene"
							);
							const guildId = discordIds.DISCORD_GUILD_ID;
							const voiceChannelId =
								discordIds.DISCORD_VOICE_CHANNEL_ID;
							if (!guildId || !voiceChannelId || !inlineBrowser) {
								throw new Error(
									"Inline Discord scene needs DISCORD_GUILD_ID + DISCORD_VOICE_CHANNEL_ID in .discord-bots.env",
								);
							}
							const discordVoice = requireArtifact(
								preludeVoice.discord,
								"discord scene",
							);
							// Smooth transition: start the narration over the product
							// view, let it lead in for a beat, THEN cut into the real
							// Discord app — so the jump reads as deliberate.
							const narrationStart = Date.now();
							timing.preludeOffsetsMs[discordVoice.id] = Math.max(
								0,
								narrationStart - videoEpochMs,
							);
							addArtifact(discordVoice);
							await browser?.waitFor(2600);
							await openDiscordVoice(inlineBrowser!, {
								guildId,
								textChannelId: discordIds.DISCORD_TEXT_CHANNEL_ID,
								voiceChannelId,
							});
							// Hold any remaining narration before the bots start.
							const introProbed = await probeDurationMs(
								discordVoice.path,
							);
							const introExact = Math.max(
								durationOfMs(discordVoice),
								introProbed ?? 0,
							);
							await browser?.waitFor(
								Math.max(
									0,
									introExact - (Date.now() - narrationStart),
								) + 400,
							);
							// The bots talk amongst themselves. Each line's TTS is
							// saved as a timed WAV and muxed at compose (deterministic,
							// no fragile Pulse capture).
							await runDiscordScene({
								onLine: async (line) => {
									const id = `${runSlug}-discord-line-${line.index}`;
									const path = `${artifactDir}/${id}.wav`;
									const wav = pcmToWav(line.pcm, line.sampleRateHz);
									await writeFile(path, wav);
									const durationMs = Math.round(
										((wav.length - 44) / 2 / line.sampleRateHz) *
											1000,
									);
									discordClipOffsetsMs[id] = Math.max(
										0,
										line.startedAtMs - videoEpochMs,
									);
									addArtifact({
										id,
										kind: "voiceover",
										metadata: { durationMs, source: "discord" },
										path,
									});
								},
							});
							await leaveDiscordVoice(inlineBrowser!);
							// Back to the fixture for the closing slate.
							await browser?.goto(targetUrl);
						},
					},
					// Closing card: branded completion slate + outro narration.
					{
						name: "outro card",
						run: async ({
							addArtifact,
							browser,
						}: {
							addArtifact: (artifact: DemoArtifact | void) => void;
							browser?: {
								evaluate?: <T>(fn: string, arg?: unknown) => Promise<T>;
								goto: (url: string) => Promise<void>;
								waitFor: (target: string | number) => Promise<void>;
							};
						}) => {
							const outro = preludeVoice.outro;
							if (!outro) return;
							// Swap the intro slate (re-shown by the reload) for the
							// branded completion slate.
							await browser?.evaluate?.(
								"() => { const intro = document.querySelector(\"[data-demo='intro-slate']\"); if (intro) { intro.classList.add('hidden'); intro.style.display = 'none'; } const exit = document.querySelector(\"[data-demo='exit-slate']\"); if (exit) { exit.classList.remove('hidden'); exit.style.display = 'flex'; } }",
							);
							await new Promise((resolve) => setTimeout(resolve, 400));
							await playNarration(browser, addArtifact, outro);
						},
					},
				]
			: []),
		markRecording("demo-complete", { outputDurationMs }),
	],
	title: "Absolute product demo",
});

if (INLINE) {
	// Stop the desktop capture (SIGINT → clean mp4 trailer) and register it as
	// the recording artifact the composer will mux narration onto.
	report = addArtifact(report, await inlineRecorder?.stop("completed"));
	await inlineBrowser?.closeTab().catch(() => undefined);
	await inlineBrowser?.close().catch(() => undefined);
} else {
	report = addArtifact(report, await session!.close(`${runSlug}-recording`));
}
report = addArtifact(report, {
	id: `${runSlug}-timeline-plan`,
	kind: "log",
	metadata: {
		actionCount: browserTimeline.actions.length,
		beatCount: browserTimeline.beats.length,
		outputDurationMs,
		source: "browser-timeline-plan",
		visualCount: browserTimeline.visuals.length,
	},
	path: timelinePlanPath,
});
for (const artifact of Object.values(voiceArtifacts)) {
	report = addArtifact(report, artifact);
}

const manifest = await writeDemoManifest(
	report,
	`${runDir}/${runSlug}.manifest.json`,
	{
		environment: process.env.DEMO_ENVIRONMENT ?? "local",
		operator: process.env.USER,
		runStamp,
	},
);

if (envFlag("DEMO_COMPOSE", true) && report.status === "completed") {
	// The product timeline started after the sign-in prelude. Its visuals are
	// driven relative to timing.timelineEpochMs; in video time that is
	// (timelineEpochMs - videoEpochMs). Shift the product voiceover offsets by
	// exactly that, and add the prelude narration at its own video offsets. All
	// offsets share one anchor (videoEpochMs), so audio lines up with the
	// recording across both the sign-ins and the walkthrough.
	const shiftMs = Math.max(0, timing.timelineEpochMs - videoEpochMs);
	const composedOffsetsMs: Record<string, number> = {
		...timing.preludeOffsetsMs,
		...Object.fromEntries(
			Object.entries(voiceoverOffsetsMs).map(([id, offset]) => [
				id,
				offset + shiftMs,
			]),
		),
		// Inline: the Discord bot lines are already absolute video offsets.
		...discordClipOffsetsMs,
	};

	// Sync-debug trace: every narration with its exact (ffprobe) duration, the
	// video offset it is placed at, and its end — sorted, with any overlap
	// flagged. Lets us verify alignment precisely instead of eyeballing it.
	const durationById = new Map(
		[
			...allVoiceArtifacts,
			// Discord bot clips are added during the run, not up front.
			...report.artifacts.filter(
				(artifact) =>
					artifact.kind === "voiceover" &&
					artifact.metadata?.source === "discord",
			),
		].map((artifact) => [artifact.id, durationOf(artifact)]),
	);
	// Guarantee zero overlaps in the composed audio: walk narrations in time
	// order and push any that would start before the previous one ends. Only the
	// tightly-packed prelude lines need this; product-timeline beats are already
	// spaced so they don't move (narration stays synced to its visual).
	const OVERLAP_GAP_MS = 120;
	let prevEndMs = -Infinity;
	for (const [id, startMs] of Object.entries(composedOffsetsMs).sort(
		(left, right) => left[1] - right[1],
	)) {
		const fixedMs = startMs < prevEndMs ? prevEndMs + OVERLAP_GAP_MS : startMs;
		composedOffsetsMs[id] = fixedMs;
		prevEndMs = fixedMs + (durationById.get(id) ?? 0);
	}
	const syncRows = Object.entries(composedOffsetsMs)
		.map(([id, startMs]) => {
			const dur = durationById.get(id) ?? 0;
			return { durationMs: dur, endMs: startMs + dur, id, startMs };
		})
		.sort((left, right) => left.startMs - right.startMs);
	const syncIssues = syncRows
		.slice(1)
		.flatMap((row, index) =>
			row.startMs < syncRows[index].endMs
				? [
						`overlap: "${row.id}" starts at ${row.startMs}ms but "${syncRows[index].id}" runs to ${syncRows[index].endMs}ms`,
					]
				: [],
		);
	const syncDebugPath = `${artifactDir}/${runSlug}.audio-sync.json`;
	await writeFile(
		syncDebugPath,
		JSON.stringify(
			{
				narrations: syncRows,
				preludeMs: shiftMs,
				runSlug,
				syncIssues,
				videoEpochMs,
			},
			null,
			2,
		),
	);
	report = addArtifact(report, {
		id: `${runSlug}-audio-sync`,
		kind: "log",
		metadata: {
			narrationCount: syncRows.length,
			overlapCount: syncIssues.length,
			source: "audio-sync",
		},
		path: syncDebugPath,
	});
	if (syncIssues.length > 0) {
		console.warn(
			`[audio-sync] ${syncIssues.length} overlap(s):\n  ${syncIssues.join("\n  ")}`,
		);
	}

	// Inline capture already spans prelude + walkthrough + the live Discord
	// phase, so keep the real recording length (probe it) and mix narration over
	// the captured Discord audio instead of replacing it. The Playwright path
	// pads a silent page video and uses voiceover-only audio.
	const recordingArt = report.artifacts.find(
		(artifact) => artifact.kind === "recording",
	);
	const inlineRecordingMs = INLINE
		? await probeDurationMs(recordingArt?.path)
		: undefined;
	const composition = await composeDemoWithFFmpeg(report, {
		// Inline video is silent (Pulse capture is unreliable on WSLg); all audio
		// — narration + the Discord bot lines — is muxed as voiceover clips.
		extendVideo: !INLINE,
		outputPath: `${runDir}/${runSlug}.mp4`,
		outputDurationMs:
			INLINE && inlineRecordingMs
				? inlineRecordingMs
				: shiftMs + outputDurationMs,
		voiceoverOffsetsMs: composedOffsetsMs,
		voiceoverTiming: "timeline",
	});
	report = addArtifact(report, composition);
	await writeDemoManifest(report, `${runDir}/${runSlug}.manifest.json`, {
		environment: process.env.DEMO_ENVIRONMENT ?? "local",
		operator: process.env.USER,
		runStamp,
	});
}

fixture?.stop();

console.log(
	JSON.stringify(
		{
			artifacts: report.artifacts,
			manifest: manifest.options?.outputPath,
			runDir,
			runId: runSlug,
			status: report.status,
		},
		null,
		2,
	),
);

// All artifacts are written and the summary is printed above. The fixture
// server and Playwright/Chrome can leave the event loop alive, so exit
// explicitly instead of hanging after the work is done.
process.exit(report.status === "completed" ? 0 : 1);
