# AbsoluteJS — E2EE example

An end-to-end, purpose-bound, model-blind six-digit-code exchange using
`@absolutejs/agent-exchange`, `@absolutejs/agent-exchange-email`,
`@absolutejs/agency`, `@absolutejs/e2ee`, and the experimental
`@absolutejs/e2ee-webcrypto` RFC 9180 envelope provider and the experimental
`@absolutejs/e2ee-mls` RFC 9420 messaging provider.

The entire protected operation runs in the browser. The demo creates a
non-exportable recipient key pair, requests exact Agency approval, consumes a
single-use execution lease, seals the value with authenticated purpose and expiry
context, opens it inside a trusted recipient tool, rejects replays, clears mutable
byte buffers, and exposes only a typed receipt to the agent.
The demo email also carries a simulated mailbox-trusted DMARC pass and echoes
the request challenge, exercising the source adapter's hardened correlation
path.

The MLS portion creates issuer-signed, public-key-bound device credentials,
publishes and consumes a one-use KeyPackage, delivers a Welcome, exchanges
sender-authenticated application messages in both directions, and
authenticated-encrypts the evolving group state under a non-exportable local
key before restoring it.

This example deliberately declares `policy + bearer + purpose-bound` assurance.
An email OTP is not phishing-resistant, even when E2EE keeps it away from both
agent models. For phishing-resistant authorization, use a request-bound WebAuthn
approval and the DPoP OAuth grant flow from `agent-exchange-providers`.

## Run

```bash
bun install
bun run dev
```

Open <http://localhost:3000> and run the strict-E2EE exchange.

## Important limitations

- This is an architecture demonstration, not an audited production OTP relay.
- The MLS provider and its TypeScript protocol engine have not received a
  production security audit. This is an interoperability and architecture demo,
  not a recommendation to ship the provider for high-risk production traffic.
- The browser UI supplies a normalized demo email to the real deterministic email
  source adapter and a recipient tool adapter. Its authentication header is a
  fixture, not evidence from a real mailbox; no model is invoked and neither
  adapter returns the protected value.
- Managed recovery is visible but intentionally gated until a recovery authority
  provider exists.
- Production deployments must replace the in-memory stores, demo consent verifier,
  direct KeyPackage handoff, key directory, and same-page transport with durable,
  independently authenticated delivery and key-transparency implementations.
- Managed recovery remains intentionally gated because this example does not
  configure an independently controlled recovery authority. Changing between
  strict E2EE and managed recovery requires a new conversation.

Private keys and plaintext never go to the example server.
