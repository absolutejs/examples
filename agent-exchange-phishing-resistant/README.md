# Phishing-resistant Agent Exchange

This AbsoluteJS example demonstrates two agents completing one narrowly scoped
action after a real, verifier-bound passkey approval. The authorization code,
PKCE verifier, DPoP access token, and decrypted grant remain inside deterministic
tools; agent-visible output is a redacted receipt.

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

The authorization server, resource server, stores, and transport are in-process
demonstration adapters. A production deployment should use durable stores and a
trusted token-confined broker. Google and Microsoft profiles remain BYO adapters,
but are not represented as satisfying this strict profile while their public
capabilities have gaps.

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

