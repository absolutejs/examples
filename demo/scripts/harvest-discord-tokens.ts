/**
 * Supervised Discord bot-token harvester.
 *
 * The Discord developer portal never re-displays an existing bot token — the
 * only way to obtain one is "Reset Token", which requires your password/2FA.
 * This script can't do that part (and shouldn't), so it splits the work:
 *
 *   - It drives a REAL, visible Chrome (a dedicated persistent profile) to each
 *     voice-tester app's Bot page.
 *   - YOU, in that window: log into Discord once, then for each bot click
 *     "Reset Token" and complete the password/2FA prompt.
 *   - It polls the page for the freshly-revealed token (DOM-agnostic — matches
 *     the token shape, so Discord UI changes don't break it) and writes them to
 *     a gitignored .discord-bots.env as DISCORD_BOT_TOKEN_1..5.
 *
 * The same profile stays logged in, so the demo reuses it as the visible
 * Discord (and Google/Meet) client.
 *
 * Run:  bun run scripts/harvest-discord-tokens.ts
 */
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const PROFILE_DIR =
	process.env.DEMO_CHROME_PROFILE ?? `${process.env.HOME}/.demo-chrome-profile`;
const OUT_ENV = `${process.cwd()}/.discord-bots.env`;
const BOT_NAMES = [
	"voice-tester",
	"voice-tester-2",
	"voice-tester-3",
	"voice-tester-4",
	"voice-tester-5",
];
// id.timestamp.hmac — the Discord/JWT-ish three-part shape. Specific enough that
// it won't match asset hashes on the page.
const TOKEN_RE = /[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/;
const APPS_URL = "https://discord.com/developers/applications";

const log = (m: string) => console.log(`[harvest] ${m}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
	channel: "chrome",
	headless: false,
	viewport: null,
});
const page = context.pages()[0] ?? (await context.newPage());

await page.goto(APPS_URL, { waitUntil: "domcontentloaded" });
log("");
log(">>> A Chrome window is open. If it shows a login, LOG INTO DISCORD now.");
log(">>> Waiting (up to 5 min) until your Applications list is visible…");

// Wait until we're on the applications page and at least one target app shows.
let loggedIn = false;
for (let i = 0; i < 150; i += 1) {
	const url = page.url();
	const body = await page
		.evaluate(() => document.body.innerText)
		.catch(() => "");
	if (
		url.includes("/developers/applications") &&
		!/log\s?in/i.test(url) &&
		BOT_NAMES.some((name) => body.includes(name))
	) {
		loggedIn = true;
		break;
	}
	await sleep(2000);
}
if (!loggedIn) {
	log("!! Never saw the applications list / bot names. Are you logged in?");
	await context.close();
	process.exit(1);
}
log("Applications list detected. Harvesting each bot.");

const tokens: Record<string, string> = {};
for (const name of BOT_NAMES) {
	log("");
	log(`=== ${name} ===`);
	await page.goto(APPS_URL, { waitUntil: "domcontentloaded" });
	await sleep(1500);
	const card = page.getByText(name, { exact: true }).first();
	if ((await card.count()) === 0) {
		log(`!! app "${name}" not found in the list — skipping.`);
		continue;
	}
	await card.click();
	await sleep(1500);
	const appId = page.url().match(/applications\/(\d+)/)?.[1];
	if (appId) {
		await page.goto(`${APPS_URL}/${appId}/bot`, {
			waitUntil: "domcontentloaded",
		});
		await sleep(1500);
	}
	// Try to drive the reset automatically. If the account requires 2FA/password
	// on reset, a prompt appears and the user completes it in the window — the
	// token poll below captures it whenever it shows, regardless of who clicked.
	try {
		await page
			.getByText("Reset Token", { exact: true })
			.first()
			.click({ timeout: 8000 });
		await sleep(800);
		// The confirm modal's button is "Yes, do it!" (not "Reset"). Some
		// accounts then show a 2FA prompt — if so, the user completes it and the
		// token poll below still captures the result.
		await page
			.getByText("Yes, do it!", { exact: true })
			.first()
			.click({ timeout: 6000 })
			.catch(() => undefined);
	} catch {
		log(`(couldn't auto-click Reset Token — click it for ${name} in the window)`);
	}
	log(">>> If a password/2FA prompt appears, complete it in the window.");
	log(">>> Waiting up to 2 min for the token to appear…");
	let token = "";
	for (let i = 0; i < 120; i += 1) {
		// The revealed token lives in an <input>/<textarea> value (and sometimes
		// in copy-button data) — NOT in innerText. Scan everything: text, input
		// values, and any data-/aria copy attributes.
		const haystack = await page
			.evaluate(() => {
				const parts: string[] = [document.body.innerText];
				for (const el of Array.from(
					document.querySelectorAll("input, textarea"),
				)) {
					const value = (el as HTMLInputElement).value;
					if (value) parts.push(value);
				}
				for (const el of Array.from(document.querySelectorAll("[aria-label],[data-clipboard-text]"))) {
					parts.push(el.getAttribute("data-clipboard-text") ?? "");
				}
				return parts.join("\n");
			})
			.catch(() => "");
		const match = haystack.match(TOKEN_RE);
		if (match) {
			token = match[0];
			break;
		}
		if (i === 8) {
			await page
				.screenshot({ path: `/tmp/harvest-${name}-early.png` })
				.catch(() => undefined);
		}
		await sleep(1000);
	}
	if (!token) {
		const shot = `/tmp/harvest-${name}.png`;
		await page.screenshot({ path: shot }).catch(() => undefined);
		log(`   (saved screenshot ${shot} for diagnosis)`);
	}
	if (!token) {
		log(`!! no token captured for ${name} (timed out).`);
		continue;
	}
	tokens[name] = token;
	log(`captured ${name}: ${token.slice(0, 8)}… (${token.length} chars)`);
}

const lines = BOT_NAMES.map((name, index) =>
	tokens[name] ? `DISCORD_BOT_TOKEN_${index + 1}=${tokens[name]}` : null,
).filter((line): line is string => line !== null);
await writeFile(OUT_ENV, `${lines.join("\n")}\n`);
log("");
log(`Wrote ${lines.length}/${BOT_NAMES.length} tokens to ${OUT_ENV}`);
log("Leave this profile logged in — the demo reuses it as the visible client.");
await context.close();
process.exit(0);
