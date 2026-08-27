# AbsoluteJS secure-transfer example

A small executable demonstration of `@absolutejs/secure-transfer` with the
interchangeable `@absolutejs/secure-transfer-webcrypto` provider.

It protects a bearer upload receipt with per-receipt WebCrypto keys, persists it
through the atomic local adapter, interrupts the source after one record, resumes
from the durable byte offset, and removes the completed receipt. It then strictly
round-trips the capability-bearing descriptor as a simulated secure-message
payload, downloads into a transactional staging sink, and proves tampering cannot
commit partial plaintext. It also retrieves an authenticated cross-record byte
range, prepares a fresh-capability attachment after a simulated MLS membership
change, distributes the new descriptor and strict supersession as one payload,
creates a durable local tombstone, removes old ciphertext, and downloads the
replacement.

```bash
bun install
bun run typecheck
bun test
```

In an application, send `encodeSecureTransferDescriptor(descriptor)` as a
`@absolutejs/secure-messaging` application message with purpose
`secure-transfer.descriptor`. The example intentionally does not pretend its
same-process descriptor handoff is a real delivery or identity system.
Send replacements with purpose `secure-transfer.replacement` and
`expectedSecurityEpoch` set to the epoch returned by the MLS membership Commit.
Authenticate the E2EE context before `activateReplacement()`, protect the fresh
bearer descriptor durably, and retain the old tombstone through descriptor
expiry. This blocks future compliant old-capability fetches; it cannot recall
keys or plaintext a recipient already copied.

The local adapter is suitable for tests and single-host installations. Multi-host
deployments can swap in `@absolutejs/secure-transfer-s3`, which uses conditional
S3/R2 writes and ETag compare-and-swap receipt leases. Decrypted filenames and
content types remain untrusted.
