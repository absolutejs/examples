# Meeting-bot admission research — why Zoom, not personal-Gmail Meet

**Goal:** a fully-automated, recorded demo where an AI is *heard talking in a real
video meeting*, with **no human clicking "Admit."** A Recall.ai bot joins the
meeting and plays TTS audio.

**Decision: use Zoom (Server-to-Server OAuth) for the meeting scene.** Google
Meet cannot be made hands-off on the account we have. See below.

Researched 2026-05-28 (deep multi-source, cross-verified vs. Recall docs, Google
Workspace release notes, and the Meet REST API). Confidence: high.

## Verdict by option

### ❌ Personal Gmail + Google Meet — IMPOSSIBLE (no workaround)
- There is **no waiting-room / "ask to join" toggle** on a personal-Gmail
  meeting. The "People who use this meeting link must get your permission before
  they can join" dialog is the only behavior. Restricted access and the
  "disable ask-to-join" host control are **Workspace-only**.
- Recall: *"By default, Google Meet bots need to be manually admitted into calls
  and will be an anonymous user."* Even an **authenticated** bot is still subject
  to the host's waiting-room settings.
- **CDP / synthetic auto-admit is a dead end by design:** Google guards the
  admit action against untrusted input; `element.click()` opens the panel but
  won't admit, and trusted `Input.dispatchMouseEvent` (even with
  `Page.bringToFront` + `Target.activateTarget`) doesn't land — the WSLg Chrome
  window isn't OS-foreground. Verified end-to-end: bot stayed `in_waiting_room`.
  **Abandoned.**

### ⚠️ Google Workspace + Google Meet — possible but costly
Two sub-paths, both need a **paid Workspace** (not personal Gmail):
1. **`accessType=OPEN` via the Meet REST API v2** — *"Anyone with the join
   information can join without knocking."* No lobby → bot auto-joins. Caveat:
   OPEN may be constrained by org admin policy / default access settings.
2. **Authenticated Recall bot on the calendar invite** — Recall bypasses the
   waiting room **only if BOTH**: (1) the bot is signed into a Google account,
   AND (2) that account's email is on the underlying calendar event
   (`google_meet.login_required=true`). Requires a **new, dedicated paid
   Workspace** (Starter tier OK) — *you cannot reuse an existing Workspace; the
   method relies on an org-wide SSO/SAML policy that would break all other
   logins* — plus a second Google account for the bot (stored creds → `auth.json`).

### ✅ Zoom (Server-to-Server OAuth) — chosen: cheapest, most reliable, hands-off
- Create the meeting with `waiting_room: false` + `join_before_host: true` →
  **no admission gate.** Recall joins the `join_url` and the bot talks. Zero
  Google anti-bot wall.
- Setup: a Zoom account + a Server-to-Server OAuth app (gives `account_id`,
  `client_id`, `client_secret`). Token: `POST https://zoom.us/oauth/token?grant_type=account_credentials&account_id=…`
  (Basic auth = base64(client_id:client_secret)). Create:
  `POST https://api.zoom.us/v2/users/me/meetings`.
- Microsoft Teams is a comparable Recall-supported fallback.

## Sources
- Recall.ai Google Meet bot docs — https://docs.recall.ai/docs/google-meet
- Google Workspace, simplified access (2023) — https://workspaceupdates.googleblog.com/2023/06/simplified-access-controls-for-google-meet.html
- Google Workspace, host management for asking to join (2025) — https://workspaceupdates.googleblog.com/2025/06/google-meet-host-management-control-for-asking-to-join-a-meeting.html
- Meet REST API v2 `spaces` (accessType) — https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces
- Meet access types (admin) — https://support.google.com/a/users/answer/11989526

## Implication for `@absolutejs/meeting-google` / the demo
- Keep `createBrowserMeetProvider` (bun-native CDP) for the **visual** "real
  meeting opening" use case (host view, no bot) — that works with no admission.
- For an **AI talking inside the meeting**, use the Zoom provider
  (`createZoomMeetingProvider`, Server-to-Server OAuth). Same `MeetingProvider`
  contract; Recall joins its `join_url`.
