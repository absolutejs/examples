/**
 * STAGED FOR EXTRACTION as `@absolutejs/meeting-zoom`.
 *
 * `createZoomMeetingProvider` — a `MeetingProvider` that creates a Zoom meeting
 * via Server-to-Server OAuth with NO waiting room, so a Recall.ai bot joins the
 * returned join_url and talks with zero admission. This is the fully-automated
 * path for "AI heard talking in a real meeting" (Google Meet can't be made
 * hands-off without a paid Workspace — see MEETING-ADMISSION-RESEARCH.md).
 *
 * Setup: a Zoom account + a Server-to-Server OAuth app (Zoom Marketplace) →
 * gives ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET. Grant the
 * `meeting:write` scope.
 *
 * The MeetingProvider/CreatedMeeting contracts are shared (today they live in
 * ../meeting-google/types; they belong upstream in @absolutejs/meeting core).
 */
import type { CreatedMeeting, MeetingProvider } from "../meeting-google/types";

export type ZoomMeetingProviderOptions = {
	accountId: string;
	clientId: string;
	clientSecret: string;
	fetchImpl?: typeof fetch;
};

export const createZoomMeetingProvider = (
	options: ZoomMeetingProviderOptions,
): MeetingProvider => {
	const fetchImpl = options.fetchImpl ?? fetch;
	const basic = Buffer.from(
		`${options.clientId}:${options.clientSecret}`,
	).toString("base64");

	const accessToken = async (): Promise<string> => {
		const response = await fetchImpl(
			`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(options.accountId)}`,
			{ headers: { authorization: `Basic ${basic}` }, method: "POST" },
		);
		const body = (await response.json()) as {
			access_token?: string;
			reason?: string;
		};
		if (!body.access_token) {
			throw new Error(
				`Zoom S2S token failed (${response.status}): ${body.reason ?? JSON.stringify(body).slice(0, 200)}`,
			);
		}
		return body.access_token;
	};

	return {
		createMeeting: async (createOptions): Promise<CreatedMeeting> => {
			const token = await accessToken();
			const response = await fetchImpl(
				"https://api.zoom.us/v2/users/me/meetings",
				{
					body: JSON.stringify({
						// type 2 = SCHEDULED meeting. This matters: a type-1
						// instant meeting only exists once a host starts it, so
						// join_before_host is silently dropped and a hostless
						// bot is held forever (Recall reports in_waiting_room).
						// A scheduled meeting honors join_before_host:true, so
						// the bot joins with no host and no admission gate.
						duration: createOptions?.durationMinutes ?? 30,
						settings: {
							// the whole point: no admission gate
							approval_type: 2, // no registration
							jbh_time: 0,
							join_before_host: true,
							waiting_room: false,
						},
						start_time: new Date().toISOString(),
						timezone: "UTC",
						topic: createOptions?.title ?? "AbsoluteJS demo meeting",
						type: 2,
					}),
					headers: {
						authorization: `Bearer ${token}`,
						"content-type": "application/json",
					},
					method: "POST",
				},
			);
			const meeting = (await response.json()) as {
				id?: number;
				join_url?: string;
				message?: string;
			};
			if (!response.ok || !meeting.join_url) {
				throw new Error(
					`Zoom meeting creation failed (${response.status}): ${meeting.message ?? JSON.stringify(meeting).slice(0, 200)}`,
				);
			}
			return {
				dispose: async () => {
					const freshToken = await accessToken().catch(() => null);
					if (!freshToken || !meeting.id) return;
					await fetchImpl(
						`https://api.zoom.us/v2/meetings/${meeting.id}`,
						{
							headers: { authorization: `Bearer ${freshToken}` },
							method: "DELETE",
						},
					).catch(() => undefined);
				},
				eventId: meeting.id ? String(meeting.id) : undefined,
				platform: "zoom",
				url: meeting.join_url,
			};
		},
	};
};
