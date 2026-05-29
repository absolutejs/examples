# Enabling the live Zoom meeting scene (requires Zoom Pro)

The inline demo currently **skirts the live Zoom meeting** because the free Zoom
tier (`us05web`) cannot host an unattended meeting (see
[`MEETING-ADMISSION-RESEARCH.md`](./MEETING-ADMISSION-RESEARCH.md) and the
"Why free tier blocks this" section below). Everything else is built and proven:
the CDP browser driver, the desktop capture, the Discord real-app scene, and the
Zoom browser-join flow itself. **Only the Zoom account tier blocks it.** This
file is the checklist to turn the live Zoom scene on once you upgrade.

## TL;DR — what to do after upgrading

1. **Upgrade to Zoom Pro** on the account behind `ZOOM_ACCOUNT_ID`
   (`2T54UPtAQX68JNBPVd2FXQ`). If you upgrade the *same* account, the existing
   Server-to-Server OAuth app and the `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` /
   `ZOOM_CLIENT_SECRET` in `.env` keep working — **nothing to re-scrape**.
   - If you instead create a *new* paid account, re-run
     `bun run scripts/connect-zoom.ts` to grab fresh creds into `.env`.
2. **(Recommended) Turn off Waiting Room at the account level** so it can never
   override the per-meeting setting: Zoom web → Settings → Meeting → Security →
   *Enable waiting room* = **off**. (On Pro this is unlocked; the per-meeting
   `waiting_room:false` we already send is then reliably honored.)
3. **Confirm join-before-host is allowed** account-wide: Settings → Meeting →
   *Allow participants to join before host* = **on**. (We already send
   `join_before_host:true` per meeting; Pro honors it.)
4. **Re-enable the scene flag** in the demo (see "Code to flip" below):
   set `DEMO_INLINE_ZOOM=true` (or remove the skip-guard) and run the demo.
5. Verify standalone first: `bun run src/meet-scene.ts` — the Recall bot should
   reach `in_call_not_recording` and play TTS with **zero** admission. Then run
   the full inline demo.

## Why the free tier blocks this (so we don't re-litigate it)

Confirmed empirically (2026-05), free `us05web` enforces all three at once:

- **One meeting at a time per host.** Any active meeting (even a stuck test one
  a bot is sitting in) makes every *new* join show **"The host has another
  meeting in progress."** We can't even end the stuck meeting via API — the S2S
  app only has `meeting:write`, not `meeting:read:list_meetings`, so we can't
  enumerate live meetings to end them; they only clear on Zoom's idle timeout.
- **Host must start the meeting.** A `type:2` scheduled meeting with
  `join_before_host:true` is honored at the API level (the create response
  echoes `join_before_host:true`), but on free tier a hostless participant is
  still held: the Recall bot sits in `in_waiting_room`; the browser gets the
  "another meeting in progress" page.
- **Waiting Room is effectively forced.** Free accounts lock "all meetings must
  be secured with one security option"; even though our `join_url` carries a
  passcode (`?pwd=`), the practical result is a hostless join is blocked.

A single early `in_call_not_recording` success was **transient account state**
(freshly toggled settings), not stable behavior. Don't trust it as proof.

The meeting **type** matters and is already fixed in code: a `type:1` *instant*
meeting only exists once a host starts it, so Zoom silently drops
`join_before_host` → use **`type:2` scheduled** (done in
`src/meeting-zoom/index.ts`). This is necessary but not sufficient on free tier.

## What is already built (no changes needed after upgrade)

| Piece | File | Status |
|---|---|---|
| Zoom meeting creation (S2S, `type:2`, no waiting room) | `src/meeting-zoom/index.ts` | ✅ done |
| Recall speaker bot in the meeting | `src/meet-scene.ts` | ✅ done (needs Pro to land in-call reliably) |
| Drive the live meeting open in the visible browser | `src/scene-zoom.ts` (`joinZoomInBrowser`) | ✅ proven into the in-meeting UI |
| CDP browser driver (run the walkthrough in your signed-in Chrome) | `src/cdp-browser.ts` | ✅ done |
| Desktop capture (x11grab + Pulse) | `@absolutejs/demo` `createScreenRecorder` | ✅ available |

`joinZoomInBrowser` already handles the whole browser-join: accept cookies →
"Join from browser" → dismiss the "see/hear you?" mic-cam modals → fill the
React-controlled name field (native setter, inside the **same-origin**
`app.zoom.us/wc` iframe via `contentDocument`) → Join → Join Audio by computer
(no mic needed; we only listen). The free tier is the *only* thing that made it
return `{ joined: false }`.

## Code to flip on (the skip-guard)

The inline orchestrator gates the Zoom scene behind `DEMO_INLINE_ZOOM`
(default off while we skirt it). After upgrading:

- Set `DEMO_INLINE_ZOOM=true` in `.env` (and ensure `DEMO_ENV_FILE` still points
  at the dealroom `.env` for `RECALL_API_KEY` / `RECALL_API_BASE_URL` /
  `DEEPGRAM_API_KEY`).
- The Meet beat then: creates a `type:2` meeting → sends the Recall bot →
  `joinZoomInBrowser` drives the visible Chrome into the live meeting → holds
  while the bot speaks → leaves. With the meeting scene off, the walkthrough's
  Meet beat shows the polished product panel instead.

## Cost / alternative

- **Zoom Pro ≈ $13–16/mo.** Fully hands-off, matches the original design.
- **Free + reliable alternative:** a **host-started** meeting — sign into Zoom in
  the demo Chrome and start the meeting as host, so tier limits don't apply. If
  you'd rather not pay, say so and I'll wire the host-started path instead (it
  needs your Zoom login in that Chrome, like Discord).
