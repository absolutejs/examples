import { expect, test } from "bun:test";
import { runSecureTransferDemo } from "../src/demo";

test("streams an encrypted attachment through untrusted storage", async () => {
  const result = await runSecureTransferDemo();
  expect(result.downloadedText).toBe(
    "A private attachment crossing an untrusted object store.",
  );
  expect(result.ciphertextRecords).toBeGreaterThan(1);
  expect(result.descriptorBytes).toBeGreaterThan(0);
  expect(result.storageCanReadPlaintext).toBe(false);
  expect(result.protectedReceiptPlaintextVisible).toBe(false);
  expect(result.resumedFromByteOffset).toBe(8);
  expect(result.tamperRejected).toBe(true);
  expect(result.partialPlaintextCommitted).toBe(false);
});
