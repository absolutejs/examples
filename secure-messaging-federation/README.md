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
- a runnable managed-inbox agent using device authorization, audience-bound
  DPoP tokens, separate authorization/resource nonces, leasing, and
  acknowledgement.

```bash
bun install
bun test
bun run typecheck
```

## Managed PaaS inbox agent

The CLI demonstrates the complete public-agent flow against an enabled AbsoluteJS
PaaS instance. It discovers both sides of OAuth, dynamically registers the agent,
starts a device authorization, obtains a DPoP sender-constrained token, retries
RFC 9449 nonce challenges with fresh proofs, leases encrypted messages, and
acknowledges them with the one-time lease capability.

```bash
cp .env.example .env
bun run inbox
```

Open the printed verification URL and approve the exact
`federation:inbox:consume` delegation. The CLI intentionally prints only message
IDs, origins, and sequence numbers. It does not print access tokens, refresh
tokens, lease capabilities, or encrypted application payloads. The DPoP private
key is non-exportable and exists only for the process lifetime.

The PaaS resource must advertise
`dpop_bound_access_tokens_required: true`. The client stops instead of silently
falling back to Bearer authentication. Authorization-server and resource-server
nonces use separate cache scopes even when both endpoints share an origin.
Discovery is fail closed: the PaaS URL, resource, issuer, OAuth endpoints, and
verification links must use HTTPS; the advertised resource and issuer must
exactly match the URLs being discovered. Error messages never include arbitrary
server response bodies.

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
