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

The tests deliberately cover both possible uncertain outcomes and a conflicting
same-revision mutation. They use synthetic sealed bytes and retain no message or
identity data.
