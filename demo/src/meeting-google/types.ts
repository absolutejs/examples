/**
 * STAGED FOR EXTRACTION as `@absolutejs/meeting-google`.
 *
 * The AbsoluteJS meeting stack has *sources* (`meeting-discord`,
 * `meeting-recall`) that JOIN a call and capture audio, but nothing that
 * CREATES a meeting. This package is that missing layer: a `MeetingProvider`.
 * The `MeetingProvider`/`CreatedMeeting` contracts belong upstream in
 * `@absolutejs/meeting` core; kept here until extraction.
 */

export type CreatedMeeting = {
	url: string;
	platform: "google-meet" | "zoom" | (string & {});
	/** Provider-specific id (calendar event id, zoom meeting id, …). */
	eventId?: string;
	/** Tear down the backing meeting/event. */
	dispose?: () => Promise<void>;
};

export type MeetingProvider = {
	createMeeting: (options?: {
		title?: string;
		durationMinutes?: number;
	}) => Promise<CreatedMeeting>;
};

export type GoogleServiceAccountKey = {
	client_email: string;
	private_key: string;
	token_uri: string;
};

/**
 * Meet-link creation needs a *user* context. Two modes:
 *  - `user`: an OAuth refresh token (any Google user, incl. personal Gmail).
 *    Obtain one with `connectGoogleCalendar` (loopback OAuth in a real browser).
 *  - `service-account` + `subject`: a service account with domain-wide
 *    delegation impersonating a Workspace user — the right mode for a Workspace
 *    customer. A bare service account on personal Gmail CANNOT create Meet links
 *    (Google returns "Invalid conference type value").
 */
export type GoogleMeetAuth =
	| {
			kind: "user";
			clientId: string;
			clientSecret: string;
			refreshToken: string;
	  }
	| {
			kind: "service-account";
			key: GoogleServiceAccountKey;
			subject?: string;
	  };
