import {
  SecureMessagingDurabilityUncertainError,
  resolveSecureMessagingStoreCommit,
  type SecureMessagingStore,
} from "@absolutejs/secure-messaging";

type SecureMessagingCommitInput = Parameters<SecureMessagingStore["commit"]>[0];

export type SecureMessagingCommitOutcome =
  "acknowledged" | "applied-after-uncertainty" | "retried-after-uncertainty";

export const commitWithAuthoritativeReconciliation = async (options: {
  readonly commit: () => ReturnType<SecureMessagingStore["commit"]>;
  readonly input: SecureMessagingCommitInput;
  readonly resolveAuthoritativeStore: () =>
    Promise<SecureMessagingStore> | SecureMessagingStore;
}): Promise<SecureMessagingCommitOutcome> => {
  try {
    const result = await options.commit();
    if (result !== "committed")
      throw new Error("Secure-messaging commit was rejected");
    return "acknowledged";
  } catch (error) {
    if (!(error instanceof SecureMessagingDurabilityUncertainError))
      throw error;
  }

  const store = await options.resolveAuthoritativeStore();
  const resolution = await resolveSecureMessagingStoreCommit(
    store,
    options.input,
  );
  if (resolution === "applied") return "applied-after-uncertainty";
  if (resolution === "conflict")
    throw new Error("Authoritative secure-messaging state conflicts");
  if ((await store.commit(options.input)) !== "committed")
    throw new Error("Reconciled secure-messaging retry was rejected");
  return "retried-after-uncertainty";
};
