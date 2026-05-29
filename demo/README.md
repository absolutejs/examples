# AbsoluteJS Demo Example

Runnable product-demo proof for `@absolutejs/demo`.

By default this starts a tiny local product fixture, drives it with Playwright,
records the browser, adds narrator cues, highlights product UI, writes a
manifest, and composes a final MP4 with FFmpeg.

The demo **opens with two real sign-ins**, then runs the product walkthrough —
all in one recording, composed into a single `.mp4` per run:

1. **Your own site** — the `form` profile drives the fixture's real login form
   (opens the auth tab, types email + password, submits, confirms authenticated).
2. **A third party you don't control** — the `form` profile logs into
   saucedemo.com by driving its real login screen.

Credentials are passed to the profiles as env *references* (`{ env: "NAME" }`),
so values never enter the script, the manifest, or the recording. They are
**required** — the demo refuses to run without them (no silent defaults).

```sh
bun install
OWN_SITE_EMAIL=owner@example.com OWN_SITE_PASSWORD='demo-password' \
SAUCE_USERNAME=standard_user SAUCE_PASSWORD=secret_sauce \
bun run demo
```

Own-site values can be anything (the fixture accepts them). For the third party,
saucedemo.com's documented public test login is `standard_user` /
`secret_sauce`. Swap in real credentials + `DEMO_TARGET_URL` to point at your
own app and a real third-party site.

Each run writes to a timestamped directory under `.demo-artifacts/`, e.g.
`.demo-artifacts/absolute-product-demo-2026-05-28T193925Z/`, containing the
recording, screenshots, voiceover audio, manifest, and the composed
`…​.mp4` — review that single MP4 to see the whole run (sign-ins included).

Voiceover uses the upgraded ElevenLabs path; `ELEVENLABS_API_KEY` loads from
`~/onspark/absolutejs/dealroom/.env` by default (set `DEMO_ENV_FILE` to change).
Set `DEMO_COMPOSE=false` to skip FFmpeg composition, `DEMO_HEADLESS=1` to run
without a visible browser.
