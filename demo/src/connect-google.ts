/**
 * One-time: mint a Google Calendar refresh token for the Meet provider.
 *
 * Prereq (console, ~3 min, in project absjs-demo-meet-fc2058): OAuth consent
 * screen → External/Testing → add yourself as a test user → add scope
 * .../auth/calendar.events; then Credentials → Create OAuth client → Desktop
 * app → download the JSON to ./.gcp-oauth-client.json (or set
 * GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET).
 *
 * Run:  bun run src/connect-google.ts
 * Approve in your real browser (click "Advanced → Go to app" on the unverified
 * screen — allowed as a test user). Writes the token to ./.gcp-meet.env.
 */
import { connectGoogleCalendar } from "./meeting-google";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const readClient = async (): Promise<{
	clientId: string;
	clientSecret: string;
}> => {
	if (
		process.env.GOOGLE_OAUTH_CLIENT_ID &&
		process.env.GOOGLE_OAUTH_CLIENT_SECRET
	) {
		return {
			clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
			clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
		};
	}
	try {
		const raw = JSON.parse(
			await readFile(`${process.cwd()}/.gcp-oauth-client.json`, "utf8"),
		) as {
			installed?: { client_id?: string; client_secret?: string };
			web?: { client_id?: string; client_secret?: string };
		};
		const creds = raw.installed ?? raw.web;
		if (creds?.client_id && creds.client_secret) {
			return {
				clientId: creds.client_id,
				clientSecret: creds.client_secret,
			};
		}
	} catch {
		/* fall through to the helpful error */
	}
	throw new Error(
		"No OAuth client found. Drop the downloaded Desktop client JSON at " +
			"./.gcp-oauth-client.json, or set GOOGLE_OAUTH_CLIENT_ID + " +
			"GOOGLE_OAUTH_CLIENT_SECRET.",
	);
};

const { clientId, clientSecret } = await readClient();

const connection = await connectGoogleCalendar({
	clientId,
	clientSecret,
	onAuthUrl: (url) => {
		console.log(`\n>>> Approve Google access in your browser:\n\n${url}\n`);
		console.log(
			'(Unverified-app screen → "Advanced" → "Go to …​ (unsafe)" — allowed as a test user.)\n',
		);
		try {
			spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
		} catch {
			/* printing the URL is enough */
		}
	},
});

await writeFile(
	`${process.cwd()}/.gcp-meet.env`,
	[
		`GOOGLE_OAUTH_CLIENT_ID=${connection.clientId}`,
		`GOOGLE_OAUTH_CLIENT_SECRET=${connection.clientSecret}`,
		`GOOGLE_CALENDAR_REFRESH_TOKEN=${connection.refreshToken}`,
		"",
	].join("\n"),
);
console.log("✓ Saved calendar credentials to .gcp-meet.env");
process.exit(0);
