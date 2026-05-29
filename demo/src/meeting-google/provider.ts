/**
 * STAGED FOR EXTRACTION as `@absolutejs/meeting-google`.
 *
 * `createGoogleMeetProvider` — a `MeetingProvider` that mints a real Google Meet
 * link via the Calendar API (`conferenceData`). The official, browser-free,
 * non-automation-blocked way to create a Meet. Recall then joins the URL.
 */
import { createSign } from "node:crypto";
import type {
	CreatedMeeting,
	GoogleMeetAuth,
	MeetingProvider,
} from "./types";

export type GoogleMeetProviderOptions = {
	auth: GoogleMeetAuth;
	calendarId?: string;
	/** Sent as x-goog-user-project so Calendar API usage is billed/quota'd to the
	 *  project that has the API enabled (needed for user creds). */
	quotaProjectId?: string;
	fetchImpl?: typeof fetch;
};

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const b64url = (value: string | object) =>
	Buffer.from(
		typeof value === "string" ? value : JSON.stringify(value),
	).toString("base64url");

const accessTokenFor = async (
	auth: GoogleMeetAuth,
	fetchImpl: typeof fetch,
): Promise<string> => {
	if (auth.kind === "user") {
		const response = await fetchImpl("https://oauth2.googleapis.com/token", {
			body: new URLSearchParams({
				client_id: auth.clientId,
				client_secret: auth.clientSecret,
				grant_type: "refresh_token",
				refresh_token: auth.refreshToken,
			}),
			headers: { "content-type": "application/x-www-form-urlencoded" },
			method: "POST",
		});
		const body = (await response.json()) as {
			access_token?: string;
			error_description?: string;
		};
		if (!body.access_token) {
			throw new Error(
				`Google token refresh failed: ${body.error_description ?? JSON.stringify(body).slice(0, 200)}`,
			);
		}
		return body.access_token;
	}
	const now = Math.floor(Date.now() / 1000);
	const claim = {
		aud: auth.key.token_uri,
		exp: now + 3600,
		iat: now,
		iss: auth.key.client_email,
		scope: CALENDAR_SCOPE,
		...(auth.subject ? { sub: auth.subject } : {}),
	};
	const signingInput = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url(claim)}`;
	const signature = createSign("RSA-SHA256")
		.update(signingInput)
		.sign(auth.key.private_key)
		.toString("base64url");
	const response = await fetchImpl(auth.key.token_uri, {
		body: new URLSearchParams({
			assertion: `${signingInput}.${signature}`,
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		}),
		headers: { "content-type": "application/x-www-form-urlencoded" },
		method: "POST",
	});
	const body = (await response.json()) as {
		access_token?: string;
		error_description?: string;
	};
	if (!body.access_token) {
		throw new Error(
			`Google service-account token failed: ${body.error_description ?? JSON.stringify(body).slice(0, 200)}`,
		);
	}
	return body.access_token;
};

export const createGoogleMeetProvider = (
	options: GoogleMeetProviderOptions,
): MeetingProvider => {
	const fetchImpl = options.fetchImpl ?? fetch;
	const calendarId = encodeURIComponent(options.calendarId ?? "primary");
	const headersFor = (token: string) => ({
		authorization: `Bearer ${token}`,
		"content-type": "application/json",
		...(options.quotaProjectId
			? { "x-goog-user-project": options.quotaProjectId }
			: {}),
	});
	return {
		createMeeting: async (createOptions): Promise<CreatedMeeting> => {
			const token = await accessTokenFor(options.auth, fetchImpl);
			const startMs = Date.now();
			const durationMinutes = createOptions?.durationMinutes ?? 30;
			const response = await fetchImpl(
				`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1`,
				{
					body: JSON.stringify({
						conferenceData: {
							createRequest: {
								conferenceSolutionKey: { type: "hangoutsMeet" },
								requestId: `absjs-demo-${startMs.toString(36)}`,
							},
						},
						end: {
							dateTime: new Date(
								startMs + durationMinutes * 60_000,
							).toISOString(),
						},
						start: { dateTime: new Date(startMs).toISOString() },
						summary: createOptions?.title ?? "AbsoluteJS demo meeting",
					}),
					headers: headersFor(token),
					method: "POST",
				},
			);
			const event = (await response.json()) as {
				hangoutLink?: string;
				id?: string;
				error?: unknown;
			};
			if (!response.ok || !event.hangoutLink) {
				throw new Error(
					`Google Meet creation failed (${response.status}): ${JSON.stringify(event.error ?? event).slice(0, 300)}`,
				);
			}
			return {
				dispose: async () => {
					const freshToken = await accessTokenFor(
						options.auth,
						fetchImpl,
					);
					await fetchImpl(
						`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
						{ headers: headersFor(freshToken), method: "DELETE" },
					).catch(() => undefined);
				},
				eventId: event.id,
				platform: "google-meet",
				url: event.hangoutLink,
			};
		},
	};
};
