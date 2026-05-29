/**
 * Real meeting scene with an AI talking inside it — fully automated, no human
 * admits anything. Creates a ZOOM meeting (Server-to-Server OAuth, no waiting
 * room) and sends a Recall.ai speaker bot that plays TTS into the call.
 *
 * Why Zoom and not Google Meet: personal-Gmail Meet can't disable admission and
 * a bot always lands in the waiting room (see MEETING-ADMISSION-RESEARCH.md).
 * Zoom with waiting_room:false + join_before_host:true has no admission gate.
 *
 * Setup: a Zoom Server-to-Server OAuth app → ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID /
 * ZOOM_CLIENT_SECRET (in the gitignored .env), scope meeting:write.
 *
 * Run:  bun run src/meet-scene.ts
 */
import { createRecallClient } from "@absolutejs/meeting-recall";
import { readFile } from "node:fs/promises";
import { createZoomMeetingProvider } from "./meeting-zoom";

const loadEnv = async (path: string, keys: Set<string>) => {
	try {
		const text = await readFile(path, "utf8");
		for (const line of text.split(/\r?\n/)) {
			const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
			if (match && keys.has(match[1]) && !process.env[match[1]]) {
				process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
			}
		}
	} catch {
		/* optional */
	}
};

// Recall + Deepgram from dealroom; Zoom S2S creds from the example's own .env.
await loadEnv(`${process.env.HOME}/onspark/absolutejs/dealroom/.env`, new Set([
	"RECALL_API_KEY",
	"RECALL_API_BASE_URL",
	"DEEPGRAM_API_KEY",
]));
await loadEnv(`${process.cwd()}/.env`, new Set([
	"ZOOM_ACCOUNT_ID",
	"ZOOM_CLIENT_ID",
	"ZOOM_CLIENT_SECRET",
]));

const need = (name: string): string => {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name} (see MEETING-ADMISSION-RESEARCH.md / .env).`);
	return value;
};
const recallApiKey = need("RECALL_API_KEY");
const deepgramKey = need("DEEPGRAM_API_KEY");

const SPEAKER_LINE =
	"Thanks for joining. The Caldera Health rescue plan is approved — sponsor email is out and the C F O follow-up is booked for Friday. I'll keep scoring the call live.";

const ttsMp3Base64 = async (text: string): Promise<string> => {
	const response = await fetch(
		"https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3",
		{
			body: JSON.stringify({ text }),
			headers: {
				Authorization: `Token ${deepgramKey}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		},
	);
	if (!response.ok) {
		throw new Error(`Deepgram TTS ${response.status}: ${await response.text()}`);
	}
	return Buffer.from(await response.arrayBuffer()).toString("base64");
};

const lastStatus = (changes?: { code: string }[]) =>
	changes?.[changes.length - 1]?.code ?? "unknown";

export const runMeetScene = async () => {
	const log = (m: string) => console.log(`[meet] ${m}`);

	const zoom = createZoomMeetingProvider({
		accountId: need("ZOOM_ACCOUNT_ID"),
		clientId: need("ZOOM_CLIENT_ID"),
		clientSecret: need("ZOOM_CLIENT_SECRET"),
	});
	log("creating Zoom meeting (no waiting room)…");
	const meeting = await zoom.createMeeting({ title: "Deal Referee — Caldera Health" });
	log(`meeting: ${meeting.url}`);

	log("synthesizing the speaker line…");
	const mp3 = await ttsMp3Base64(SPEAKER_LINE);

	const recall = createRecallClient({
		apiKey: recallApiKey,
		...(process.env.RECALL_API_BASE_URL
			? { baseUrl: process.env.RECALL_API_BASE_URL }
			: {}),
	});
	log("sending Recall speaker bot…");
	const bot = await recall.createBot({
		automatic_audio_output: {
			in_call_recording: { data: { b64_data: mp3, kind: "mp3" } },
		},
		bot_name: "Deal Referee",
		meeting_url: meeting.url,
	});
	log(`bot ${bot.id} dispatched (no admission needed on Zoom).`);

	for (let i = 0; i < 40; i += 1) {
		await new Promise((resolve) => setTimeout(resolve, 3000));
		const status = lastStatus((await recall.getBot(bot.id)).status_changes);
		log(`bot status: ${status}`);
		if (status === "in_call_recording" || status === "in_call_not_recording") {
			log("✓ bot is in the call and playing audio.");
			break;
		}
		if (status === "fatal" || status === "call_ended" || status === "done") {
			log(`bot ended (${status}).`);
			break;
		}
	}
	return { botId: bot.id, dispose: meeting.dispose, url: meeting.url };
};

await runMeetScene();
process.exit(0);
