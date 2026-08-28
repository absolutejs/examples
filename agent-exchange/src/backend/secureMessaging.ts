import type {
  AuthenticationService,
  DeliveryMessage,
  DeliveryService,
  E2EEKeyPackage,
  KeyPackageDirectory,
} from "@absolutejs/e2ee";
import {
  createMlsMessagingProvider,
  type MlsStateProtection,
} from "@absolutejs/e2ee-mls";
import {
  createSecureMessagingClient,
  type SecureMessagingClient,
  type SecureMessagingOutboxEntry,
  type SecureMessagingStore,
  type SecureMessagingStoredConversation,
} from "@absolutejs/secure-messaging";
import {
  AGENT_EXCHANGE_SECURE_MESSAGING_RECEIPT_PURPOSE,
  AGENT_EXCHANGE_SECURE_MESSAGING_REQUEST_PURPOSE,
} from "@absolutejs/agent-exchange-secure-messaging";
import {
  createPostgresJsSecureMessagingClient,
  createPostgresSecureMessagingStore,
} from "@absolutejs/secure-messaging-postgres";

const hex = (bytes: Uint8Array) =>
  [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");

const authenticationService = (): AuthenticationService => {
  const bindings = new Map<string, string>();
  let sequence = 0;
  return {
    issueDeviceCredential: async ({ deviceId, identityId, publicKey }) => {
      const bytes = new TextEncoder().encode(`credential-${sequence++}`);
      bindings.set(hex(bytes), hex(publicKey));
      return {
        bytes,
        deviceId,
        expiresAt: Date.now() + 86_400_000,
        identityId,
        issuedAt: Date.now(),
      };
    },
    sameIdentity: async (left, right) => left.identityId === right.identityId,
    validateDeviceCredential: async ({ credential, publicKey }) => ({
      identityId: credential.identityId,
      status:
        bindings.get(hex(credential.bytes)) === hex(publicKey)
          ? "valid"
          : "invalid",
    }),
  };
};

const stateProtection = async (): Promise<MlsStateProtection> => {
  const key = await crypto.subtle.generateKey(
    { length: 256, name: "AES-GCM" },
    false,
    ["decrypt", "encrypt"],
  );
  return {
    open: async ({ sealedState }) =>
      new Uint8Array(
        await crypto.subtle.decrypt(
          { iv: sealedState.slice(0, 12), name: "AES-GCM" },
          key,
          sealedState.slice(12),
        ),
      ),
    seal: async ({ state }) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
          { iv, name: "AES-GCM" },
          key,
          Uint8Array.from(state),
        ),
      );
      const sealed = new Uint8Array(iv.length + ciphertext.length);
      sealed.set(iv);
      sealed.set(ciphertext, iv.length);
      return sealed;
    },
  };
};

const messagingStore = (): SecureMessagingStore => {
  const conversations = new Map<string, SecureMessagingStoredConversation>();
  const receipts = new Map<string, string>();
  const outbox = new Map<string, SecureMessagingOutboxEntry>();
  return {
    commit: async ({
      conversation,
      expectedRevision,
      inbound,
      outbox: next,
    }) => {
      const prior = conversations.get(conversation.conversationId);
      if (
        (expectedRevision === undefined && prior !== undefined) ||
        (expectedRevision !== undefined && prior?.revision !== expectedRevision)
      )
        return "state-conflict";
      if (inbound !== undefined) {
        const key = `${inbound.conversationId}:${inbound.messageId}`;
        const digest = receipts.get(key);
        if (digest !== undefined && digest !== inbound.digest)
          return "replay-conflict";
        receipts.set(key, inbound.digest);
      }
      conversations.set(conversation.conversationId, {
        ...conversation,
        sealedState: conversation.sealedState.slice(),
      });
      for (const entry of next ?? []) outbox.set(entry.queueId, entry);
      return "committed";
    },
    inspectInbound: async ({ conversationId, digest, messageId }) => {
      const prior = receipts.get(`${conversationId}:${messageId}`);
      return prior === undefined
        ? "new"
        : prior === digest
          ? "duplicate"
          : "conflict";
    },
    listOutbox: async (limit) => [...outbox.values()].slice(0, limit),
    loadConversation: async (conversationId) =>
      conversations.get(conversationId),
    recordInbound: async (receipt) => {
      const key = `${receipt.conversationId}:${receipt.messageId}`;
      const prior = receipts.get(key);
      if (prior === receipt.digest) return "duplicate";
      if (prior !== undefined) return "conflict";
      receipts.set(key, receipt.digest);
      return "recorded";
    },
    removeConversation: async (conversationId, expectedRevision) => {
      if (conversations.get(conversationId)?.revision !== expectedRevision)
        return false;
      conversations.delete(conversationId);
      return true;
    },
    removeOutbox: async (queueIds) => {
      for (const queueId of queueIds) outbox.delete(queueId);
    },
  };
};

export type DemoMessagingPair = {
  readonly conversationId: string;
  readonly recipient: SecureMessagingClient;
  readonly recipientDeviceId: string;
  readonly requester: SecureMessagingClient;
  readonly requesterDeviceId: string;
};

export type DemoMessagingStores = {
  readonly recipient: SecureMessagingStore;
  readonly requester: SecureMessagingStore;
};

export const createDemoPostgresMessagingStores = (options: {
  readonly postgres: unknown;
  readonly tenantId: string;
}): DemoMessagingStores => {
  const client = createPostgresJsSecureMessagingClient(options.postgres);
  return Object.freeze({
    recipient: createPostgresSecureMessagingStore({
      client,
      deviceId: "recipient-device-1",
      durability: "local-wal",
      tenantId: options.tenantId,
    }),
    requester: createPostgresSecureMessagingStore({
      client,
      deviceId: "requester-device-1",
      durability: "local-wal",
      tenantId: options.tenantId,
    }),
  });
};

export const createDemoMessagingPair = async (
  now: number,
  stores: DemoMessagingStores = {
    recipient: messagingStore(),
    requester: messagingStore(),
  },
): Promise<DemoMessagingPair> => {
  const requesterDeviceId = "requester-device-1";
  const recipientDeviceId = "recipient-device-1";
  const conversationId = "opaque-agent-exchange-conversation-1";
  const authentication = authenticationService();
  const protection = await stateProtection();
  const providerOptions = {
    authenticationService: authentication,
    authorizeMembershipChange: () => true,
    stateProtection: protection,
  };
  const requesterProvider = await createMlsMessagingProvider(providerOptions);
  const recipientProvider = await createMlsMessagingProvider(providerOptions);
  const requesterCredential = await requesterProvider.createDeviceCredential({
    deviceId: requesterDeviceId,
    identityId: "requesting-person",
  });
  const recipientCredential = await recipientProvider.createDeviceCredential({
    deviceId: recipientDeviceId,
    identityId: "mailbox-owner",
  });
  const keyPackages = new Map<string, E2EEKeyPackage>();
  const keyPackageDirectory: KeyPackageDirectory = {
    claim: async (identityId) => {
      const value = keyPackages.get(identityId);
      keyPackages.delete(identityId);
      return value;
    },
    publish: async (keyPackage) => {
      keyPackages.set(keyPackage.credential.identityId, keyPackage);
    },
    remove: async () => undefined,
  };
  const queues = new Map<string, DeliveryMessage[]>();
  const delivery: DeliveryService = {
    acknowledge: async ({ deviceId }) => {
      queues.set(deviceId, []);
    },
    receive: async ({ deviceId }) => ({
      cursor: `cursor-${deviceId}`,
      messages: queues.get(deviceId) ?? [],
    }),
    send: async (messages) => {
      for (const message of messages) {
        if (!message.recipientDeviceId)
          throw new Error("The demo requires an exact recipient device.");
        queues.set(message.recipientDeviceId, [
          ...(queues.get(message.recipientDeviceId) ?? []),
          message,
        ]);
      }
    },
  };
  let identifier = 0;
  const common = {
    delivery,
    idFactory: () => `membership-${identifier++}`,
    keyPackageDirectory,
    membershipPolicy: {
      authorize: () => true,
      reviewInvitation: () => "accept" as const,
    },
    now: () => now,
    policy: {
      authorize: ({ purpose }: { readonly purpose: string }) =>
        purpose === AGENT_EXCHANGE_SECURE_MESSAGING_REQUEST_PURPOSE ||
        purpose === AGENT_EXCHANGE_SECURE_MESSAGING_RECEIPT_PURPOSE,
      maximumFrameBytes: 2_000_000,
      maximumFutureSkewMs: 300_000,
      maximumMessageBytes: 1_500_000,
      maximumTtlMs: 60_000,
      securityMode: "strict-e2ee" as const,
    },
  };
  const requester = createSecureMessagingClient({
    ...common,
    deviceCredential: requesterCredential,
    provider: requesterProvider,
    store: stores.requester,
  });
  const recipient = createSecureMessagingClient({
    ...common,
    deviceCredential: recipientCredential,
    provider: recipientProvider,
    store: stores.recipient,
  });
  await recipient.publishKeyPackage(now + 60_000);
  await requester.createConversation(conversationId);
  await requester.invite({
    conversationId,
    identityId: recipientCredential.identityId,
    ttlMs: 60_000,
  });
  const joined = await recipient.receive();
  if (!joined.joined.includes(conversationId))
    throw new Error("The recipient did not join the MLS conversation.");
  return {
    conversationId,
    recipient,
    recipientDeviceId,
    requester,
    requesterDeviceId,
  };
};
