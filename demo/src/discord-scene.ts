/**
 * "AIs talking amongst themselves" in a REAL Discord voice channel — using the
 * in-house stack dealroom ships (@absolutejs/meeting-discord), which sends audio
 * in a way that works under Bun. (voice-tester's transport.speakPcm hangs under
 * Bun; meeting-discord's source.speak() is the path the Deal Referee uses.)
 *
 * Each bot (its own token → its own gateway connection) joins the voice channel
 * as a meeting source and speaks scripted lines in turn, synthesized with
 * Deepgram Aura in a distinct voice. The visible Discord client (joined to the
 * same channel) plays the audio; the full-screen recorder captures it via Pulse.
 *
 * Requires the @snazzah/davey native binding (DAVE voice encryption): the
 * NAPI_RS_NATIVE_LIBRARY_PATH env must point at davey's .node, and davey's
 * loader is patched so that env actually takes effect (see patches/).
 *
 * Run:  NAPI_RS_NATIVE_LIBRARY_PATH=… bun run src/discord-scene.ts
 */
import type { MeetingSource } from "@absolutejs/meeting";
import { readFile } from "node:fs/promises";

// @discordjs/voice's DAVE encryption (@snazzah/davey) is a NAPI-RS native
// module; under Bun it must be pointed at its .node via this env BEFORE davey
// loads (and davey's loader is patched so the env takes effect — see patches/).
// Set it first, then dynamic-import the modules that pull davey in.
process.env.NAPI_RS_NATIVE_LIBRARY_PATH ||= `${process.cwd()}/node_modules/@snazzah/davey-linux-x64-gnu/davey.linux-x64-gnu.node`;
const { auraSpeak } = await import("@absolutejs/voice-tester");
const { createDiscordMeetingSource } = await import(
	"@absolutejs/meeting-discord"
);

const loadEnvFile = async (path: string, only?: Set<string>) => {
	try {
		const text = await readFile(path, "utf8");
		for (const line of text.split(/\r?\n/)) {
			const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
			if (!match) continue;
			const [, key, raw] = match;
			if (only && !only.has(key)) continue;
			if (process.env[key]) continue;
			process.env[key] = raw.replace(/^["']|["']$/g, "");
		}
	} catch {
		/* optional */
	}
};

const SPEAK_SAMPLE_RATE = 48000;

// Deepgram TTS occasionally drops the socket mid-stream (ECONNRESET); a couple
// of retries keeps one blip from killing the whole scene.
const auraSpeakResilient = async (
	text: string,
	tts: { apiKey: string; model: string },
): Promise<Int16Array | Buffer> => {
	let lastError: unknown;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			return await auraSpeak(text, tts, { sampleRateHz: SPEAK_SAMPLE_RATE });
		} catch (error) {
			lastError = error;
			await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
		}
	}
	throw lastError;
};

const CONVERSATION: { bot: number; text: string }[] = [
	{
		bot: 0,
		text: "Heads up team. Caldera Health just moved to procurement and it's flagged high risk. Executive alignment is still open.",
	},
	{
		bot: 1,
		text: "I pulled the call notes. The economic buyer hasn't joined the last two calls. That's our biggest gap right now.",
	},
	{
		bot: 2,
		text: "I drafted the sponsor email and a pricing guardrail. I can queue the C F O follow-up before Friday if we're aligned.",
	},
	{
		bot: 0,
		text: "Do it. Book the rescue sync, and I'll have the referee sit in and score the call live.",
	},
	{
		bot: 1,
		text: "Posted the plan, the meeting link, and the draft to the war room. We're covered.",
	},
];

export type DiscordSpokenLine = {
	bot: string;
	index: number;
	pcm: Int16Array | Buffer;
	sampleRateHz: number;
	// Wall-clock (Date.now()) captured just before the line starts playing — the
	// orchestrator turns this into a video offset for deterministic audio muxing.
	startedAtMs: number;
	text: string;
};

export const runDiscordScene = async (options?: {
	onLine?: (line: DiscordSpokenLine) => void | Promise<void>;
}) => {
	const log = (m: string) => console.log(`[discord] ${m}`);
	await loadEnvFile(`${process.cwd()}/.discord-bots.env`);
	await loadEnvFile(
		`${process.env.HOME}/onspark/absolutejs/dealroom/.env`,
		new Set(["DEEPGRAM_API_KEY"]),
	);
	const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
	const guildId = process.env.DISCORD_GUILD_ID;
	const channelId = process.env.DISCORD_VOICE_CHANNEL_ID;
	if (!DEEPGRAM_API_KEY || !guildId || !channelId) {
		throw new Error(
			"Need DEEPGRAM_API_KEY (dealroom) + DISCORD_GUILD_ID + DISCORD_VOICE_CHANNEL_ID (.discord-bots.env).",
		);
	}
	const BOTS = [
		{ name: "Aria", token: process.env.DISCORD_BOT_TOKEN_1, voice: "aura-asteria-en" },
		{ name: "Orion", token: process.env.DISCORD_BOT_TOKEN_2, voice: "aura-orion-en" },
		{ name: "Luna", token: process.env.DISCORD_BOT_TOKEN_3, voice: "aura-luna-en" },
	].filter((bot): bot is { name: string; token: string; voice: string } =>
		Boolean(bot.token),
	);

	log(`connecting ${BOTS.length} bots to voice channel ${channelId}…`);
	const sources: MeetingSource[] = [];
	for (const bot of BOTS) {
		const source = createDiscordMeetingSource({ channelId, guildId, token: bot.token });
		await source.start();
		sources.push(source);
		log(`${bot.name} joined`);
	}
	try {
		let index = 0;
		for (const turn of CONVERSATION) {
			const source = sources[turn.bot];
			const bot = BOTS[turn.bot];
			if (!source?.speak || !bot) continue;
			log(`${bot.name}: ${turn.text}`);
			const pcm = await auraSpeakResilient(turn.text, {
				apiKey: DEEPGRAM_API_KEY,
				model: bot.voice,
			});
			const startedAtMs = Date.now();
			await options?.onLine?.({
				bot: bot.name,
				index,
				pcm,
				sampleRateHz: SPEAK_SAMPLE_RATE,
				startedAtMs,
				text: turn.text,
			});
			await source.speak({
				channels: 1,
				data: new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength),
				format: "pcm",
				sampleRateHz: SPEAK_SAMPLE_RATE,
			});
			index += 1;
			await new Promise((resolve) => setTimeout(resolve, 450));
		}
		log("conversation complete");
	} finally {
		for (const source of sources) await source.stop().catch(() => undefined);
	}
};

if (import.meta.main) {
	await runDiscordScene();
	process.exit(0);
}
