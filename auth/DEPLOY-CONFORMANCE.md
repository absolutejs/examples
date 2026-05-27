# Deploying `auth.absolutejs.com` — the public AbsoluteJS auth deployment

This `auth/` example app has every `@absolutejs/auth` block enabled
out of the box. Deployed at `auth.absolutejs.com` it serves three
purposes at once:

- **The OIDC issuer** any RP can test against
- **The target** the OpenID Foundation conformance suite hits during
  certification (see `~/abs/auth/conformance/README.md`)
- **The live demo** for the showcase pages (React/Vue/Svelte/Angular/HTML/HTMX)

One deploy, one URL, one brand. The whole AbsoluteJS infrastructure
lives under `absolutejs.com`.

## Quick deploy via DigitalOcean App Platform

```bash
# from the examples repo root
doctl apps create --spec auth/.do/app.yaml
```

Cost: ~$5/mo on `basic-xs`.

## Required env vars (set after first deploy)

| Var | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Neon | Free tier works. The auth example uses Neon HTTP + serverless. Use a dedicated DB; the conformance suite tries hostile inputs. |
| `SESSION_SECRET` | `openssl rand -hex 32` | Cookie / state signing |
| `OIDC_SIGNING_KEY_JWK` | `bun -e "..."` | ES256 keypair, exported as JWK. See package README. |
| `ISSUER` | `app.yaml` | Pre-set to `https://auth.absolutejs.com` |

## DNS

CNAME `auth.absolutejs.com` → the DigitalOcean App's URL (you get
the URL after the first deploy completes; copy it from the App's
overview page).

## Verifying the deploy

```bash
curl -i https://auth.absolutejs.com/.well-known/openid-configuration
# Expect 200 OK with the discovery JSON.
# Expect response_modes_supported: ['query','form_post']
# Expect authorization_response_iss_parameter_supported: true
```

## Running the conformance suite against it

```bash
cd ~/abs/auth      # the @absolutejs/auth package directory
./conformance/setup.sh    # one-time, ~15-20 min
TARGET_ISSUER=https://auth.absolutejs.com ./conformance/run.sh
# UI lands on https://localhost:8443
```

## Alternative deploys

The Dockerfile is portable; any container host works. For Fly:

```bash
fly launch --dockerfile auth/Dockerfile
fly secrets set DATABASE_URL=... SESSION_SECRET=... OIDC_SIGNING_KEY_JWK=...
fly deploy
```

For Render: connect the repo, set `auth/` as the root, point at the
Dockerfile, set the env vars in the dashboard.

## Risks

- The conformance suite intentionally sends malformed / hostile requests.
  Don't reuse a production database; spin up a dedicated Neon project for
  `auth.absolutejs.com`.
- Because the same URL serves the showcase demo AND the OIDC issuer AND
  the conformance target, treat the DB as test-only — no real PII
  belongs there.
- Once OpenID Foundation certification is paid for, this instance becomes
  the certified deployment. Drift = embarrassment; CI nightly runs +
  alerts on regression are the right answer (`.github/workflows/conformance.yml`).
