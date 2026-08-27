# AbsoluteJS secure-transfer example

A small executable demonstration of `@absolutejs/secure-transfer` with the
interchangeable `@absolutejs/secure-transfer-webcrypto` provider.

It splits a private note across authenticated AES-256-GCM records, stores only
ciphertext in an untrusted in-memory object store, strictly round-trips the
capability-bearing descriptor as a simulated secure-message payload, downloads
into a transactional staging sink, and proves tampering cannot commit partial
plaintext.

```bash
bun install
bun run typecheck
bun test
```

In an application, send `encodeSecureTransferDescriptor(descriptor)` as a
`@absolutejs/secure-messaging` application message with purpose
`secure-transfer.descriptor`. The example intentionally does not pretend its
same-process descriptor handoff is a real delivery or identity system.

The in-memory store is deliberately tiny. Production stores must provide
create-only writes, bounded reads, expiry cleanup, authorization, and opaque key
mapping. Decrypted filenames and content types remain untrusted.
