# AbsoluteJS — E2EE example

An end-to-end, purpose-bound, model-blind six-digit-code exchange using
`@absolutejs/agent-exchange`, `@absolutejs/agent-exchange-email`,
`@absolutejs/agency`, `@absolutejs/e2ee`, and the experimental
`@absolutejs/e2ee-webcrypto` RFC 9180 envelope provider.

The entire protected operation runs in the browser. The demo creates a
non-exportable recipient key pair, requests exact Agency approval, consumes a
single-use execution lease, seals the value with authenticated purpose and expiry
context, opens it inside a trusted recipient tool, rejects replays, clears mutable
byte buffers, and exposes only a typed receipt to the agent.
The demo email also carries a simulated mailbox-trusted DMARC pass and echoes
the request challenge, exercising the source adapter's hardened correlation
path.

## Run

```bash
bun install
bun run dev
```

Open <http://localhost:3000> and run the strict-E2EE exchange.

## Important limitations

- This is an architecture demonstration, not an audited production OTP relay.
- It demonstrates a single-recipient HPKE envelope, not MLS messaging.
- The browser UI supplies a normalized demo email to the real deterministic email
  source adapter and a recipient tool adapter. Its authentication header is a
  fixture, not evidence from a real mailbox; no model is invoked and neither
  adapter returns the protected value.
- Managed recovery is visible but intentionally gated until a recovery authority
  provider exists.
- Production deployments must replace the in-memory stores, demo consent verifier,
  key directory, and same-page transport with durable, independently authenticated
  implementations.

Private keys and plaintext never go to the example server.
