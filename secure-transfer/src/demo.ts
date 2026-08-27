import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createSecureTransferClient,
  decodeSecureTransferDescriptor,
  decodeSecureTransferRevocation,
  encodeSecureTransferDescriptor,
  encodeSecureTransferRevocation,
  type SecureTransferStore,
} from "@absolutejs/secure-transfer";
import {
  localProtectedReceiptStore,
  localSecureTransferRevocationStore,
  localSecureTransferStore,
} from "@absolutejs/secure-transfer-local";
import {
  createSecureTransferWebcryptoProvider,
  createSecureTransferWebcryptoReceiptProtector,
} from "@absolutejs/secure-transfer-webcrypto";

export type SecureTransferDemoResult = {
  readonly authenticatedRangeText: string;
  readonly ciphertextRecords: number;
  readonly descriptorBytes: number;
  readonly downloadedText: string;
  readonly partialPlaintextCommitted: false;
  readonly protectedReceiptPlaintextVisible: false;
  readonly revocationBytes: number;
  readonly revokedDownloadBlocked: true;
  readonly resumedFromByteOffset: number;
  readonly storageCanReadPlaintext: false;
  readonly tamperRejected: true;
};

const contains = (haystack: Uint8Array, needle: Uint8Array): boolean => {
  if (needle.length > haystack.length) return false;
  for (let offset = 0; offset <= haystack.length - needle.length; offset += 1)
    if (needle.every((value, index) => haystack[offset + index] === value))
      return true;
  return false;
};

export const runSecureTransferDemo =
  async (): Promise<SecureTransferDemoResult> => {
    const root = await mkdtemp(
      join(tmpdir(), "absolute-secure-transfer-example-"),
    );
    try {
      const local = localSecureTransferStore({ root });
      const capturedCiphertext: Uint8Array[] = [];
      let tamperReads = false;
      const store: SecureTransferStore = {
        ...local,
        getRecord: async (input) => {
          const bytes = await local.getRecord(input);
          if (!tamperReads || bytes === undefined || input.recordIndex !== 0)
            return bytes;
          const tampered = bytes.slice();
          tampered[0] = (tampered[0] ?? 0) ^ 1;
          return tampered;
        },
        putRecord: async (input) => {
          const result = await local.putRecord(input);
          if (result === "created")
            capturedCiphertext.push(input.bytes.slice());
          return result;
        },
      };
      const receiptStore = localProtectedReceiptStore({ root });
      const revocations = localSecureTransferRevocationStore({ root });
      const receiptProtector =
        await createSecureTransferWebcryptoReceiptProtector({
          key: crypto.getRandomValues(new Uint8Array(32)),
        });
      const transfer = createSecureTransferClient({
        cryptoProvider: createSecureTransferWebcryptoProvider(),
        now: () => 1_000,
        policy: {
          maximumAttachmentBytes: 1_024,
          maximumDescriptorBytes: 4_096,
          maximumFutureSkewMs: 100,
          maximumMetadataBytes: 512,
          maximumRecordPlaintextBytes: 8,
          maximumRecords: 128,
          maximumTtlMs: 1_000,
        },
        resumable: {
          leaseDurationMs: 100,
          protector: receiptProtector,
          store: receiptStore,
        },
        revocations,
        store,
        transferIdFactory: () => "opaque-transfer-id",
      });
      const plaintext = new TextEncoder().encode(
        "A private attachment crossing an untrusted object store.",
      );
      const { receiptId } = await transfer.beginResumableUpload({
        attachmentId: "attachment-1",
        byteLength: plaintext.length,
        contentType: "text/plain",
        conversationId: "conversation-1",
        expiresAt: 1_500,
        fileName: "private-note.txt",
        senderDeviceId: "alice-phone",
      });

      const receiptDirectory = join(root, ".receipts");
      const [receiptFile] = (await readdir(receiptDirectory)).filter((name) =>
        name.endsWith(".receipt.json"),
      );
      if (receiptFile === undefined)
        throw new Error("Protected receipt missing.");
      const receiptState = new Uint8Array(
        await readFile(join(receiptDirectory, receiptFile)),
      );
      const protectedReceiptPlaintextVisible = contains(
        receiptState,
        new TextEncoder().encode("private-note.txt"),
      );
      if (protectedReceiptPlaintextVisible)
        throw new Error("Receipt storage received visible bearer metadata.");

      let firstPull = true;
      await transfer
        .resumeUpload({
          receiptId,
          source: () =>
            new ReadableStream<Uint8Array>({
              pull(controller) {
                if (firstPull) {
                  firstPull = false;
                  controller.enqueue(plaintext.slice(0, 8));
                } else {
                  controller.error(new Error("simulated interrupted source"));
                }
              },
            }),
        })
        .then(
          () => {
            throw new Error("Interrupted source unexpectedly completed.");
          },
          () => undefined,
        );

      let resumedFromByteOffset = -1;
      const descriptor = await transfer.resumeUpload({
        receiptId,
        source: (byteOffset) => {
          resumedFromByteOffset = byteOffset;
          return plaintext.slice(byteOffset);
        },
      });

      // This capability-bearing descriptor must be the plaintext of a
      // @absolutejs/secure-messaging message, never public object metadata.
      const protectedChannelPayload =
        encodeSecureTransferDescriptor(descriptor);
      const receivedDescriptor = decodeSecureTransferDescriptor(
        protectedChannelPayload,
        4_096,
      );
      const staged: Uint8Array[] = [];
      let committed = false;
      await transfer.download(receivedDescriptor, {
        abort: async () => {
          staged.length = 0;
        },
        commit: async () => {
          committed = true;
        },
        write: async (record) => {
          staged.push(record.slice());
        },
      });
      if (!committed) throw new Error("Transactional sink did not commit.");
      const downloaded = Uint8Array.from(
        staged.flatMap((record) => [...record]),
      );
      const storedCiphertext = Uint8Array.from(
        capturedCiphertext.flatMap((record) => [...record]),
      );
      const storageCanReadPlaintext = contains(storedCiphertext, plaintext);
      if (storageCanReadPlaintext)
        throw new Error("Untrusted storage received visible plaintext.");

      const rangeRecords: Uint8Array[] = [];
      await transfer.downloadRange(
        receivedDescriptor,
        { start: 2, endExclusive: 15 },
        {
          abort: async () => {
            rangeRecords.length = 0;
          },
          commit: async () => undefined,
          write: async (bytes) => {
            rangeRecords.push(bytes.slice());
          },
        },
      );
      const authenticatedRangeText = new TextDecoder().decode(
        Uint8Array.from(rangeRecords.flatMap((record) => [...record])),
      );

      tamperReads = true;
      let tamperRejected = false;
      let partialPlaintextCommitted = false;
      await transfer
        .download(receivedDescriptor, {
          abort: async () => undefined,
          commit: async () => {
            partialPlaintextCommitted = true;
          },
          write: async () => undefined,
        })
        .catch(() => {
          tamperRejected = true;
        });
      if (!tamperRejected || partialPlaintextCommitted)
        throw new Error("Tampered download did not fail transactionally.");

      tamperReads = false;
      const { ciphertextRemoved, revocation } = await transfer.revoke({
        descriptor: receivedDescriptor,
        reason: "member-removed",
        revokerDeviceId: "alice-phone",
      });
      if (!ciphertextRemoved)
        throw new Error("Local ciphertext cleanup unexpectedly failed.");
      // In production this strict payload travels in authenticated E2EE with
      // purpose `secure-transfer.revocation`. Authorize its sender before apply.
      const encodedRevocation = encodeSecureTransferRevocation(revocation);
      const receivedRevocation = decodeSecureTransferRevocation(
        encodedRevocation,
        1_024,
      );
      await transfer.applyRevocation({
        descriptor: receivedDescriptor,
        revocation: receivedRevocation,
      });
      let revokedDownloadBlocked = false;
      await transfer
        .download(receivedDescriptor, {
          abort: async () => undefined,
          commit: async () => undefined,
          write: async () => undefined,
        })
        .catch(() => {
          revokedDownloadBlocked = true;
        });
      if (!revokedDownloadBlocked)
        throw new Error("A revoked attachment remained downloadable.");

      return Object.freeze({
        authenticatedRangeText,
        ciphertextRecords: descriptor.recordCount,
        descriptorBytes: protectedChannelPayload.length,
        downloadedText: new TextDecoder().decode(downloaded),
        partialPlaintextCommitted: false,
        protectedReceiptPlaintextVisible,
        revocationBytes: encodedRevocation.length,
        revokedDownloadBlocked: true,
        resumedFromByteOffset,
        storageCanReadPlaintext,
        tamperRejected: true,
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  };
