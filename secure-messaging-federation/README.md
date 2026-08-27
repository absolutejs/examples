# Secure messaging federation example

This example shows the complete safe boundary for cross-provider messaging:

- exact, mutually signed profile negotiation with no weaker fallback;
- an explicitly experimental MIMI draft revision guard;
- a strict HTTPS batch round-trip through the interchangeable delivery bridge;
- the hardened HTTPS adapter's bounded, DNS-pinned multi-address fallback;
- a protected MLS-frame placeholder authenticated from one domain to another;
- minimal routing metadata, durable replay rejection, and destination binding;
- user-approved abuse evidence sealed endpoint-to-moderator; and
- explicit `receiver-asserted` authenticity instead of a false franking claim.

```bash
bun install
bun test
bun run typecheck
```

The random opaque payload represents the bytes produced by
`@absolutejs/secure-messaging`; it is not a substitute for MLS. The MIMI adapter
is a profile/revision guard because the referenced Internet-Drafts still have
wire-format and identifier gaps. It is not advertised as interoperable MIMI.
The delivery adapter package itself runs a real bidirectional MLS integration
test; this compact example concentrates on the federation and routing boundary.
The HTTPS adapter's own real-socket test proves that an unreachable first
address falls through to a second pinned address while preserving mutual TLS,
DNS SAN validation, certificate pins, and the default public-address policy.

For an agent-mediated verification-code workflow, keep the code inside the E2EE
application payload and use an exact, revocable `@absolutejs/agent-exchange`
standing mandate. Never place the code, email address, user ID, or request text in
the federation route, logs, or model-selected abuse evidence.
