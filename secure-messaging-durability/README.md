# AbsoluteJS secure-messaging durability example

A focused example of safely resolving a storage mutation whose acknowledgement
was lost after it may already have committed. It uses the provider-neutral
`SecureMessagingDurabilityUncertainError` and
`resolveSecureMessagingStoreCommit()` contract shared by the PostgreSQL and
Redis adapters.

```bash
bun install
bun run typecheck
bun test
```

`commitWithAuthoritativeReconciliation()` has three successful outcomes:

- `acknowledged`: the original mutation returned `committed`;
- `applied-after-uncertainty`: the authoritative store contains the exact
  intended conversation, so the atomic replay/outbox effects already exist; or
- `retried-after-uncertainty`: the authoritative store still contains the exact
  expected prior revision, so one compare-and-swap retry committed.

Every other authoritative state fails closed. In a Redis Sentinel deployment,
resolve the current primary through a Sentinel-aware client before calling this
function. Never resolve against an isolated former primary. Configure
`min-replicas-to-write`, `min-replicas-max-lag`, AOF, `WAITAOF`, and
`maxmemory-policy noeviction`; those controls reduce failure windows but do not
make blind retries safe.

[`src/redisTls.ts`](src/redisTls.ts) shows both direct and Sentinel-aware
ioredis construction with certificate verification and mutual TLS required.
The Sentinel mode explicitly enables TLS for Sentinel discovery as well as the
resolved Redis primary. Always pass a DNS name that appears in the server
certificate as `servername`; connecting to an IP must not disable hostname or
CA verification.

Provision each application identity through
`provisionRedisSecureMessagingIdentity()`. It consumes the adapter's exported
deny-first ACL contract: exact commands only, no Pub/Sub channels, and only the
configured secure-messaging key prefix. Keep separate ACL users for the
application, replication, Sentinel monitoring, Sentinel peers, and
administration, and disable Redis's default user.

Rotate without an outage in this order:

1. Issue a new named ACL credential and client certificate.
2. Connect and exercise the new identity over verified TLS.
3. Move traffic, disable the old ACL user, and kill its existing connections.
4. Remove the old client CA from the Redis trust bundle only after every client
   uses the new certificate.
5. Run the PaaS `adversarial.secure-messaging-redis-transport-rotation` drill
   and retain its sanitized evidence.

Never log connection options: they contain the password, private key, and
client certificate. Prefer secret-file mounts with private permissions over
environment variables for production key material.

The tests deliberately cover both possible uncertain outcomes and a conflicting
same-revision mutation. They use synthetic sealed bytes and retain no message or
identity data.
