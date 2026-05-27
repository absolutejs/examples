# AbsoluteJS Auth example

OAuth2 authentication with [`@absolutejs/auth`](https://github.com/absolutejs/absolute-auth),
demonstrated across **all six AbsoluteJS frontends — React, Vue, Svelte, Angular,
HTML, and HTMX** — backed by **one** Elysia server, **one** JSON/OAuth API, and
**one** shared CSS file.

## What it shows

Every framework implements the same flows against the shared backend:

**OAuth / accounts (every framework):**

- **Sign in / sign up** with any of ~60 OAuth2 providers (one-tap buttons for a
  featured few, plus a full provider dropdown).
- **Protected page** that renders the authenticated user record.
- **Settings** — account overview, link additional login providers to the same
  canonical user, search/sort linked identities, set a primary identity, remove
  identities, resolve account-merge requests, and delete the account.
- **Connectors** — link Google (Gmail/Contacts) and Meta (Facebook/Instagram)
  data connectors, then view and revoke the resulting OAuth grants and the
  external accounts discovered for them.

**Post-OAuth surfaces (rolling out per framework — React first):**

- **Credentials** — email + password sign-up / sign-in via `createAuthClient`,
  with HIBP breach check at register + login and disposable-domain rejection.
- **Passkeys** — WebAuthn conditional-UI autofill + "upgrade to passkey" prompt
  built on the `usePasskeyAutofill` + `useUpgradeToPasskey` composables from
  `@absolutejs/auth/react` (Vue / Solid / Svelte sub-exports follow).
- **MFA** — TOTP enrollment + challenge.
- **Passwordless** — magic links + OTP.
- **Sessions** — list + remote-revoke the user's own devices.
- **Audit** — tamper-evident hash-chained event log.
- **IdP** — this app is itself an OAuth2/OIDC provider (discovery, JWKS, DCR).

The backend wires every block from `@absolutejs/auth@0.40.0` in
`src/backend/auth/showcaseBlocks.ts` — comment one block out and only its
routes disappear. Emails / magic links / OTPs log to the server console in
the showcase so you don't need a real mailer.

The React/Vue/Svelte/Angular surfaces are SPAs that call a shared JSON API
(`/api/*`); HTML drives the same API from a vanilla-DOM script; HTMX uses
server-rendered fragments. All six share `src/frontend/styles/indexes/auth.css`.

## Run it

```bash
bun install

# Configure secrets (.env): a Neon/Postgres DATABASE_URL, an
# OAUTH2_CALLBACK_URI=http://localhost:3000/oauth2/callback, and the provider
# client id/secret pairs you want to use (see .env.example).
bun db:push        # provision the auth + linked-provider tables
bun dev            # http://localhost:3000
```

> A Postgres database (e.g. Neon) is required — the session store and user data
> live there. `providersConfiguration` reads every provider's credentials from
> the environment, so set the providers you intend to demo.

### Showcase env vars (optional but recommended)

```bash
PUBLIC_ORIGIN=http://localhost:3000   # used for WebAuthn rpId + OIDC issuer
OIDC_SIGNING_KEY_JWK=                 # generated at boot if unset (logged with a warning)
MFA_ENCRYPTION_KEY=                   # generated at boot if unset (TOTP secrets lost on reboot)
AUDIT_INTEGRITY_SECRET=               # falls back to keyless SHA-256 chaining if unset
```

## Routes

| Path | Framework |
| --- | --- |
| `/` | Landing page (links to all six) |
| `/react`, `/react/{protected,settings,connectors}` | React (UniversalRouter) |
| `/vue`, `/vue/*` | Vue (vue-router) |
| `/svelte`, `/svelte/*` | Svelte (`@absolutejs/absolute/svelte/router`) |
| `/angular`, `/angular/*` | Angular (`provideRouter`) |
| `/html`, `/html/*` | HTML (static page + fetch/DOM script) |
| `/htmx`, `/htmx/*` | HTMX (server-rendered fragments) |
| `/oauth2/*` | Auth library routes (authorize/callback/status/signout, IdP endpoints) |
| `/auth/*` | Credentials / MFA / passkeys / passwordless / sessions routes |
| `/.well-known/openid-configuration` | OIDC discovery (the example is an IdP) |
| `/api/*` | Shared JSON API (identities, linked providers, account) |

## Scripts

`bun dev` · `bun start` · `bun run build` · `bun run typecheck` · `bun run lint`
· `bun run format` · `bun db:push` · `bun db:studio`
