import {
  SecureMessagingDurabilityUncertainError,
  type SecureMessagingStore,
  type SecureMessagingStoredConversation,
} from "@absolutejs/secure-messaging";
import { expect, test } from "bun:test";
import { commitWithAuthoritativeReconciliation } from "../src/reconcile";

const intended: SecureMessagingStoredConversation = {
  conversationId: "conversation-1",
  revision: 2,
  sealedState: Uint8Array.of(2, 3),
  securityMode: "strict-e2ee",
  status: "active",
};

const createStore = (
  initial: SecureMessagingStoredConversation | undefined,
) => {
  let state = initial;
  let commits = 0;
  const store: SecureMessagingStore = {
    commit: async ({ conversation, expectedRevision }) => {
      commits += 1;
      if (state?.revision !== expectedRevision) return "state-conflict";
      state = {
        ...conversation,
        sealedState: conversation.sealedState.slice(),
      };
      return "committed";
    },
    inspectInbound: async () => "new",
    listOutbox: async () => [],
    loadConversation: async () => state,
    recordInbound: async () => "recorded",
    removeConversation: async () => false,
    removeOutbox: async () => undefined,
  };
  return { commitCount: () => commits, store };
};

test("does not retry an exact mutation already present after uncertainty", async () => {
  const authoritative = createStore(intended);
  const outcome = await commitWithAuthoritativeReconciliation({
    commit: async () => {
      throw new SecureMessagingDurabilityUncertainError();
    },
    input: { conversation: intended, expectedRevision: 1 },
    resolveAuthoritativeStore: () => authoritative.store,
  });
  expect(outcome).toBe("applied-after-uncertainty");
  expect(authoritative.commitCount()).toBe(0);
});

test("retries once only when the expected prior revision is authoritative", async () => {
  const authoritative = createStore({
    ...intended,
    revision: 1,
    sealedState: Uint8Array.of(1),
  });
  const outcome = await commitWithAuthoritativeReconciliation({
    commit: async () => {
      throw new SecureMessagingDurabilityUncertainError();
    },
    input: { conversation: intended, expectedRevision: 1 },
    resolveAuthoritativeStore: () => authoritative.store,
  });
  expect(outcome).toBe("retried-after-uncertainty");
  expect(authoritative.commitCount()).toBe(1);
});

test("fails closed when another mutation owns the intended revision", async () => {
  const authoritative = createStore({
    ...intended,
    sealedState: Uint8Array.of(99),
  });
  await expect(
    commitWithAuthoritativeReconciliation({
      commit: async () => {
        throw new SecureMessagingDurabilityUncertainError();
      },
      input: { conversation: intended, expectedRevision: 1 },
      resolveAuthoritativeStore: () => authoritative.store,
    }),
  ).rejects.toThrow("conflicts");
  expect(authoritative.commitCount()).toBe(0);
});
