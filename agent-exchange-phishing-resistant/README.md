# Phishing-resistant Agent Exchange

This AbsoluteJS example demonstrates two agents completing one narrowly scoped
action after a real, verifier-bound passkey approval. The authorization code,
PKCE verifier, DPoP access token, and decrypted grant remain inside deterministic
tools; agent-visible output is a redacted receipt.

It also demonstrates the explicitly weaker compatibility mode requested for
email verification: the passkey approval remains phishing-resistant, while the
six-digit email code is honestly labeled a relayable bearer secret. The code is
submitted through `@absolutejs/agent-exchange-destinations` and a fixed
`@absolutejs/agent-exchange-http-destination`; it is never returned to either
agent.

The standing mode demonstrates the asynchronous human workflow: the owner uses
a passkey once to sign a short-lived, revocable mandate restricted to one exact
requester agent, OAuth delegation, recipient agent, mailbox, purpose,
destination origin, operation, secret kind, and maximum use count. The agent can
then request the bounded action while the owner is offline. Each request still
requires its own OAuth-authenticated agent identity in PaaS; the in-process demo
models that verified identity as a fixed delegation so the mandate mechanics
remain easy to inspect.

```bash
bun install
bun run dev
```

Open the local URL, create a passkey, then approve the exchange. Local HTTP is a
deliberate WebAuthn development exception implemented only for `localhost` and
`127.0.0.1`. Production origins must use HTTPS.

## What is real

- WebAuthn registration and authentication through `@simplewebauthn`
- request-digest-bound user approval through `@absolutejs/agent-exchange-webauthn`
- one-time Agency lease, authenticated HPKE envelope, recipient consent, and replay guard
- OAuth PAR, RAR authorization details, S256 PKCE, issuer checking, resource indicators
- non-exportable WebCrypto P-256 DPoP key, authorization-server nonce retry, and `ath`
- one-time, DPoP-bound protected-resource call and agent-visible leakage canary
- exact origin/operation/secret-kind destination routing, fixed HTTPS endpoint,
  redirect rejection, isolated secret bytes, and a response-body-blind receipt
- RFC 7515 ES256 JWS standing mandates over RFC 8785 canonical JSON, with exact
  actor/delegation binding, atomic replay/use accounting, expiry, and revocation

The authorization server, resource server, mailbox code, destination, stores,
and transport are in-process demonstration adapters. A production deployment
should use the durable PaaS broker, real mailbox source, encrypted destination
credentials, and an operator-reviewed destination allowlist. Google and
Microsoft profiles remain BYO adapters, but are not represented as satisfying
the strict sender-constrained profile while their public capabilities have gaps.

## Standards

- WebAuthn Level 3: <https://www.w3.org/TR/webauthn-3/>
- OAuth Security BCP (RFC 9700): <https://www.rfc-editor.org/rfc/rfc9700>
- PKCE (RFC 7636): <https://www.rfc-editor.org/rfc/rfc7636>
- PAR (RFC 9126): <https://www.rfc-editor.org/rfc/rfc9126>
- RAR (RFC 9396): <https://www.rfc-editor.org/rfc/rfc9396>
- Resource Indicators (RFC 8707): <https://www.rfc-editor.org/rfc/rfc8707>
- Authorization Server Issuer Identification (RFC 9207): <https://www.rfc-editor.org/rfc/rfc9207>
- DPoP (RFC 9449): <https://www.rfc-editor.org/rfc/rfc9449>
- HPKE (RFC 9180): <https://www.rfc-editor.org/rfc/rfc9180>
- JSON Web Signature (RFC 7515): <https://www.rfc-editor.org/rfc/rfc7515>
- JSON Canonicalization Scheme (RFC 8785): <https://www.rfc-editor.org/rfc/rfc8785>
- OAuth Token Exchange subject/actor model (RFC 8693): <https://www.rfc-editor.org/rfc/rfc8693>
