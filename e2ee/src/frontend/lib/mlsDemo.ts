import type {
  AuthenticationService,
  DeviceCredential,
  MessagingProcessResult,
  SecurityMode,
} from "@absolutejs/e2ee";
import {
  createMlsMessagingProvider,
  type MlsStateProtection,
} from "@absolutejs/e2ee-mls";

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
const STATE_VERSION = 1;
const STATE_AAD = textEncoder.encode("absolutejs:mls-state:v1");

type CredentialClaims = {
  readonly deviceId: string;
  readonly expiresAt: number;
  readonly identityId: string;
  readonly issuedAt: number;
  readonly publicKey: string;
};

type SignedCredential = {
  readonly claims: CredentialClaims;
  readonly signature: string;
};

export type MlsDemoResult = {
  readonly aliceReceived: string;
  readonly bobReceived: string;
  readonly ciphertextBytes: number;
  readonly conversationId: string;
  readonly epoch: number;
  readonly members: readonly string[];
  readonly protocol: string;
  readonly provider: string;
  readonly restoredState: true;
  readonly securityMode: SecurityMode;
};

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
};

const fromBase64Url = (value: string): Uint8Array => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const encodeClaims = (claims: CredentialClaims): Uint8Array =>
  textEncoder.encode(JSON.stringify(claims));

const asArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  Uint8Array.from(bytes).buffer as ArrayBuffer;

const createAuthenticationService =
  async (): Promise<AuthenticationService> => {
    const issuer = (await crypto.subtle.generateKey("Ed25519", false, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;

    return {
      issueDeviceCredential: async ({ deviceId, identityId, publicKey }) => {
        const issuedAt = Date.now();
        const claims: CredentialClaims = {
          deviceId,
          expiresAt: issuedAt + 60 * 60 * 1_000,
          identityId,
          issuedAt,
          publicKey: toBase64Url(publicKey),
        };
        const signature = new Uint8Array(
          await crypto.subtle.sign(
            "Ed25519",
            issuer.privateKey,
            asArrayBuffer(encodeClaims(claims)),
          ),
        );
        return {
          bytes: textEncoder.encode(
            JSON.stringify({ claims, signature: toBase64Url(signature) }),
          ),
          deviceId,
          expiresAt: claims.expiresAt,
          identityId,
          issuedAt,
        };
      },
      sameIdentity: async (left, right) => left.identityId === right.identityId,
      validateDeviceCredential: async ({ credential, publicKey }) => {
        try {
          const signed = JSON.parse(
            textDecoder.decode(credential.bytes),
          ) as SignedCredential;
          const metadataMatches =
            signed.claims.deviceId === credential.deviceId &&
            signed.claims.expiresAt === credential.expiresAt &&
            signed.claims.identityId === credential.identityId &&
            signed.claims.issuedAt === credential.issuedAt &&
            signed.claims.publicKey === toBase64Url(publicKey);
          const validSignature = await crypto.subtle.verify(
            "Ed25519",
            issuer.publicKey,
            asArrayBuffer(fromBase64Url(signed.signature)),
            asArrayBuffer(encodeClaims(signed.claims)),
          );
          return {
            identityId: credential.identityId,
            status:
              metadataMatches &&
              validSignature &&
              (credential.expiresAt === undefined ||
                credential.expiresAt > Date.now())
                ? "valid"
                : "invalid",
          };
        } catch {
          return { identityId: credential.identityId, status: "invalid" };
        }
      },
    };
  };

const createStateProtection = async (): Promise<MlsStateProtection> => {
  const key = await crypto.subtle.generateKey(
    { length: 256, name: "AES-GCM" },
    false,
    ["decrypt", "encrypt"],
  );
  return {
    open: async ({ sealedState }) => {
      if (sealedState.length < 14 || sealedState[0] !== STATE_VERSION) {
        throw new Error("Invalid sealed MLS state.");
      }
      return new Uint8Array(
        await crypto.subtle.decrypt(
          {
            additionalData: STATE_AAD,
            iv: sealedState.slice(1, 13),
            name: "AES-GCM",
          },
          key,
          sealedState.slice(13),
        ),
      );
    },
    seal: async ({ state }) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
          { additionalData: STATE_AAD, iv, name: "AES-GCM" },
          key,
          Uint8Array.from(state),
        ),
      );
      const sealedState = new Uint8Array(1 + iv.length + ciphertext.length);
      sealedState[0] = STATE_VERSION;
      sealedState.set(iv, 1);
      sealedState.set(ciphertext, 13);
      return sealedState;
    },
  };
};

const readApplicationMessage = (
  result: MessagingProcessResult | undefined,
): string => {
  if (result?.kind !== "application") {
    throw new Error("Expected an MLS application message.");
  }
  return textDecoder.decode(result.message.plaintext);
};

export const runMlsDemo = async (
  securityMode: SecurityMode,
): Promise<MlsDemoResult> => {
  if (securityMode === "managed-recovery") {
    throw new Error(
      "Managed recovery needs a separately configured recovery authority; this browser demo intentionally has none.",
    );
  }

  const authenticationService = await createAuthenticationService();
  const aliceStateProtection = await createStateProtection();
  const bobStateProtection = await createStateProtection();
  const authorizeAliceMembership = ({ sender }: { sender: DeviceCredential }) =>
    sender.deviceId === "alice-phone";
  const aliceProvider = await createMlsMessagingProvider({
    authenticationService,
    authorizeMembershipChange: authorizeAliceMembership,
    stateProtection: aliceStateProtection,
  });
  const bobProvider = await createMlsMessagingProvider({
    authenticationService,
    authorizeMembershipChange: authorizeAliceMembership,
    stateProtection: bobStateProtection,
  });
  const alice = await aliceProvider.createDeviceCredential({
    deviceId: "alice-phone",
    identityId: "alice",
  });
  const bob = await bobProvider.createDeviceCredential({
    deviceId: "bob-laptop",
    identityId: "bob",
  });
  const bobKeyPackage = await bobProvider.createKeyPackage({
    credential: bob,
    expiresAt: Date.now() + 5 * 60_000,
  });
  const conversationId = `demo-${crypto.randomUUID()}`;
  const aliceSession = await aliceProvider.createConversation({
    conversationId,
    creatorCredential: alice,
    securityMode,
  });
  const membership = await aliceSession.addMembers([bobKeyPackage]);
  const welcome = membership.welcomes[0];
  if (welcome === undefined)
    throw new Error("MLS did not create Bob's Welcome.");
  const bobSession = await bobProvider.joinConversation({
    credential: bob,
    welcome: welcome.bytes,
  });

  const aliceMessage = await aliceSession.protect(
    textEncoder.encode("sender-authenticated hello from Alice"),
    {
      conversationId,
      purpose: "chat.message",
      securityEpoch: aliceSession.epoch,
      senderId: alice.deviceId,
    },
  );
  const bobReceived = readApplicationMessage(
    await bobSession.process(aliceMessage),
  );
  const bobMessage = await bobSession.protect(
    textEncoder.encode("sender-authenticated hello from Bob"),
    {
      conversationId,
      purpose: "chat.message",
      securityEpoch: bobSession.epoch,
      senderId: bob.deviceId,
    },
  );
  const aliceReceived = readApplicationMessage(
    await aliceSession.process(bobMessage),
  );

  const sealedState = await aliceProvider.sealConversationState(aliceSession);
  await aliceSession.close();
  const restoredAlice = await aliceProvider.restoreConversation({
    sealedState,
  });
  const members = (await restoredAlice.members()).map(
    (member) => member.credential.deviceId,
  );
  await restoredAlice.close();
  await bobSession.close();

  return {
    aliceReceived,
    bobReceived,
    ciphertextBytes: aliceMessage.bytes.length + bobMessage.bytes.length,
    conversationId,
    epoch: membership.epoch,
    members,
    protocol: aliceMessage.protocol,
    provider: aliceProvider.manifest.packageName,
    restoredState: true,
    securityMode,
  };
};
