import { describe, expect, test } from "bun:test";
import { runMlsDemo } from "../src/frontend/lib/mlsDemo";

describe("MLS browser example", () => {
  test("joins two devices, exchanges messages, and restores sealed state", async () => {
    const result = await runMlsDemo("strict-e2ee");

    expect(result.protocol).toBe("MLS-1.0");
    expect(result.epoch).toBe(1);
    expect(result.members).toEqual(["alice-phone", "bob-laptop"]);
    expect(result.aliceReceived).toBe("sender-authenticated hello from Bob");
    expect(result.bobReceived).toBe("sender-authenticated hello from Alice");
    expect(result.restoredState).toBe(true);
    expect(result.ciphertextBytes).toBeGreaterThan(0);
  });

  test("does not imply recovery without a recovery authority", async () => {
    await expect(runMlsDemo("managed-recovery")).rejects.toThrow(
      "separately configured recovery authority",
    );
  });
});
