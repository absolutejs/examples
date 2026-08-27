# AbsoluteJS secure agent exchange example

This example runs the original two-person automation scenario end to end:

1. A mailbox owner enrolls one exact standing mandate after a user-verified
   passkey ceremony.
2. Their trusted requesting agent asks a paired recipient agent to complete one
   verification challenge.
3. The owner-side broker verifies the signed mandate, independently checks the
   requesting agent's delegation, and retrieves one challenge-correlated email.
4. The six-digit code is HPKE-protected, carried through a device-bound
   strict-E2EE MLS conversation, and submitted by a deterministic tool. The MLS
   receipt is atomically queued before the request is acknowledged. Neither
   agent model, receipt, API response, nor Agency history receives the code.

The mailbox, passkey result, and destination are synthetic so the example is
safe to run locally. The mandate itself is a real Ed25519-signed compact JWS,
the email parser is the real `@absolutejs/email` path, and the envelope is the
real certified WebCrypto HPKE provider.
The two endpoints use the real `@absolutejs/e2ee-mls` provider through
`@absolutejs/secure-messaging`, and the response leg uses the interchangeable
`@absolutejs/agent-exchange-secure-messaging` transport.

The demo defaults to isolated memory stores so it starts without infrastructure.
For a durable run, apply the migration exported by
`@absolutejs/secure-messaging-postgres` and pass stores created with
`createDemoPostgresMessagingStores({ postgres, tenantId })` into
`createDemoMessagingPair`. Requester and recipient device IDs receive separate
database namespaces even when they belong to the same tenant.

The page also runs purpose-substitution and replay probes. Both must fail before
another mailbox read or destination submission.

## Run

```sh
bun install
bun run dev
```

Open `http://localhost:3000` and select **Run secure exchange**.

## Verify

```sh
bun run test
bun run typecheck
bun run build
```

Email codes remain bearer credentials. This example makes the request,
authorization, retrieval, delivery, and execution path phishing-resistant and
model-blind; it does not turn an email OTP into a phishing-resistant
authenticator.
