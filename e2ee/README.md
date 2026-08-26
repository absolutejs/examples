# AbsoluteJS — E2EE example

Explicit provider selection and a purpose-bound, model-blind six-digit-code
exchange using `@absolutejs/e2ee` and the experimental
`@absolutejs/e2ee-webcrypto` RFC 9180 envelope provider.

The entire protected operation runs in the browser. The demo creates a
non-exportable recipient key pair, seals the value with authenticated purpose and
expiry context, opens it inside a simulated trusted recipient tool, clears the
mutable byte buffers, and exposes only a typed receipt to the simulated agent.

## Run

```bash
bun install
bun run dev
```

Open <http://localhost:3000> and run the strict-E2EE exchange.

## Important limitations

- This is an architecture demonstration, not an audited production OTP relay.
- It demonstrates a single-recipient HPKE envelope, not MLS messaging.
- The browser UI stands in for deterministic source and recipient tools; no model
  is invoked.
- Managed recovery is visible but intentionally gated until a recovery authority
  provider exists.
- Production Agent Exchange will add Absolute Auth identity, Agency authorization
  and single-use leases, A2A transport, deterministic email parsing, and durable
  redacted receipts.

Private keys and plaintext never go to the example server.
