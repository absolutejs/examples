/**
 * STAGED FOR EXTRACTION as `@absolutejs/meeting-google`.
 *
 * A meeting *provider* for the AbsoluteJS meeting stack: creates a real Google
 * Meet (Calendar API) and supplies the URL that `@absolutejs/meeting-recall` /
 * `meeting-discord` *sources* then join. Pairs with `connectGoogleCalendar`
 * (one-time loopback OAuth) to obtain the user calendar token Meet creation
 * requires. OAuth machinery itself is `@absolutejs/auth`/citra's domain — this
 * package only needs the resulting token.
 */
export {
	connectGoogleCalendar,
	type ConnectGoogleCalendarOptions,
	type GoogleCalendarConnection,
} from "./connect";
export {
	createBrowserMeetProvider,
	type BrowserMeetProviderOptions,
} from "./browserProvider";
export {
	createGoogleMeetProvider,
	type GoogleMeetProviderOptions,
} from "./provider";
export type {
	CreatedMeeting,
	GoogleMeetAuth,
	GoogleServiceAccountKey,
	MeetingProvider,
} from "./types";
