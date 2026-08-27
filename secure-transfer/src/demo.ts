import {
  createSecureTransferClient,
  decodeSecureTransferDescriptor,
  encodeSecureTransferDescriptor,
  type SecureTransferStore,
} from "@absolutejs/secure-transfer";
import { createSecureTransferWebcryptoProvider } from "@absolutejs/secure-transfer-webcrypto";

export type SecureTransferDemoResult = {
  readonly ciphertextRecords: number;
  readonly descriptorBytes: number;
  readonly downloadedText: string;
  readonly partialPlaintextCommitted: false;
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
    const records = new Map<string, Uint8Array>();
    const store: SecureTransferStore = {
      id: "demo-untrusted-store",
      getRecord: async ({ recordIndex, transferId }) =>
        records.get(`${transferId}:${recordIndex}`)?.slice(),
      putRecord: async ({ bytes, recordIndex, transferId }) => {
        const key = `${transferId}:${recordIndex}`;
        if (records.has(key)) return "exists";
        records.set(key, bytes.slice());
        return "created";
      },
      removeTransfer: async (transferId) => {
        for (const key of [...records.keys()])
          if (key.startsWith(`${transferId}:`)) records.delete(key);
      },
    };
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
      store,
      transferIdFactory: () => "opaque-transfer-id",
    });
    const plaintext = new TextEncoder().encode(
      "A private attachment crossing an untrusted object store.",
    );
    const descriptor = await transfer.upload({
      attachmentId: "attachment-1",
      body: plaintext,
      byteLength: plaintext.length,
      contentType: "text/plain",
      conversationId: "conversation-1",
      expiresAt: 1_500,
      fileName: "private-note.txt",
      senderDeviceId: "alice-phone",
    });

    // This capability-bearing descriptor must be the plaintext of a
    // @absolutejs/secure-messaging message, never public object metadata.
    const protectedChannelPayload = encodeSecureTransferDescriptor(descriptor);
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
    const downloaded = Uint8Array.from(staged.flatMap((record) => [...record]));
    const storedCiphertext = Uint8Array.from(
      [...records.values()].flatMap((record) => [...record]),
    );
    const storageCanReadPlaintext = contains(storedCiphertext, plaintext);
    if (storageCanReadPlaintext)
      throw new Error("Untrusted storage received visible plaintext.");

    const first = records.get("opaque-transfer-id:0");
    if (first === undefined)
      throw new Error("Expected the first ciphertext record.");
    first[0] = (first[0] ?? 0) ^ 1;
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

    return Object.freeze({
      ciphertextRecords: descriptor.recordCount,
      descriptorBytes: protectedChannelPayload.length,
      downloadedText: new TextDecoder().decode(downloaded),
      partialPlaintextCommitted: false,
      storageCanReadPlaintext,
      tamperRejected: true,
    });
  };
