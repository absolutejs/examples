/**
 * STAGED FOR EXTRACTION as `@absolutejs/meeting-google`.
 *
 * `connectGoogleCalendar` — a one-time installed-app (loopback) OAuth flow that
 * mints a calendar refresh token in the user's REAL browser. This is the unlock
 * vs. gcloud's ADC ("app blocked"): with OUR OWN OAuth client (Testing mode,
 * the user a test user), Google permits the sensitive `calendar.events` scope.
 *
 * Flow: start a localhost server → print the consent URL → user approves in
 * their real browser → Google redirects to localhost with a code → exchange it
 * for a refresh token. No automation-controlled browser, so nothing is blocked.
 */
import { createServer } from "node:http";

export type GoogleCalendarConnection = {
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	scopes: string[];
};

export type ConnectGoogleCalendarOptions = {
	clientId: string;
	clientSecret: string;
	scopes?: string[];
	/** Fixed loopback port (must be allowed by the OAuth client). Default: ephemeral. */
	port?: number;
	/** How long to wait for the user to finish consenting. Default 300s. */
	timeoutMs?: number;
	/** Receives the consent URL (default: prints it). */
	onAuthUrl?: (url: string) => void;
};

const DEFAULT_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export const connectGoogleCalendar = (
	options: ConnectGoogleCalendarOptions,
): Promise<GoogleCalendarConnection> => {
	const scopes = options.scopes ?? DEFAULT_SCOPES;
	const onAuthUrl =
		options.onAuthUrl ??
		((url: string) =>
			console.log(`\nOpen this URL in your browser to grant access:\n\n${url}\n`));
	return new Promise((resolve, reject) => {
		let redirectUri = "";
		const timer = setTimeout(() => {
			server.close();
			reject(new Error("connectGoogleCalendar timed out waiting for consent"));
		}, options.timeoutMs ?? 300_000);

		const server = createServer((req, res) => {
			const requestUrl = new URL(req.url ?? "/", "http://localhost");
			const code = requestUrl.searchParams.get("code");
			const error = requestUrl.searchParams.get("error");
			if (!code && !error) {
				res.writeHead(404);
				res.end();
				return;
			}
			res.writeHead(200, { "content-type": "text/html" });
			res.end(
				"<h2>Google connected.</h2><p>You can close this tab and return to the terminal.</p>",
			);
			clearTimeout(timer);
			server.close();
			if (error || !code) {
				reject(new Error(`Google OAuth error: ${error ?? "no code"}`));
				return;
			}
			void (async () => {
				try {
					const tokenResponse = await fetch(
						"https://oauth2.googleapis.com/token",
						{
							body: new URLSearchParams({
								client_id: options.clientId,
								client_secret: options.clientSecret,
								code,
								grant_type: "authorization_code",
								redirect_uri: redirectUri,
							}),
							headers: {
								"content-type": "application/x-www-form-urlencoded",
							},
							method: "POST",
						},
					);
					const tokens = (await tokenResponse.json()) as {
						refresh_token?: string;
						error_description?: string;
					};
					if (!tokens.refresh_token) {
						reject(
							new Error(
								`No refresh token returned: ${tokens.error_description ?? JSON.stringify(tokens).slice(0, 200)}. (Ensure access_type=offline + prompt=consent, and revoke prior grants if reusing.)`,
							),
						);
						return;
					}
					resolve({
						clientId: options.clientId,
						clientSecret: options.clientSecret,
						refreshToken: tokens.refresh_token,
						scopes,
					});
				} catch (caught) {
					reject(caught instanceof Error ? caught : new Error(String(caught)));
				}
			})();
		});

		server.listen(options.port ?? 0, "127.0.0.1", () => {
			const address = server.address();
			const port =
				typeof address === "object" && address ? address.port : options.port;
			redirectUri = `http://localhost:${port}`;
			const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
			authUrl.searchParams.set("client_id", options.clientId);
			authUrl.searchParams.set("redirect_uri", redirectUri);
			authUrl.searchParams.set("response_type", "code");
			authUrl.searchParams.set("scope", scopes.join(" "));
			authUrl.searchParams.set("access_type", "offline");
			authUrl.searchParams.set("prompt", "consent");
			authUrl.searchParams.set("include_granted_scopes", "true");
			onAuthUrl(authUrl.toString());
		});
		server.on("error", (caught) => {
			clearTimeout(timer);
			reject(caught);
		});
	});
};
