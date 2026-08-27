import {
  FEDERATION_CONTRACT,
  activateFederationSession,
  canonicalBytes,
  confirmFederationTranscript,
  createFederationAbuseReport,
  negotiateFederation,
  signFederationEnvelope,
  type FederationOffer,
  type FederationSignatureProvider,
} from "@absolutejs/secure-messaging-federation";
import { createFederatedDeliveryService } from "@absolutejs/secure-messaging-federation-delivery";
import {
  decodeFederationHttpsBatch,
  encodeFederationHttpsBatch,
} from "@absolutejs/secure-messaging-federation-https";
import {
  MIMI_DRAFT_OPT_IN,
  MIMI_DRAFT_REVISIONS,
  assertMimiDraftAdvertisement,
  createMimiDraftProfile,
} from "@absolutejs/secure-messaging-federation-mimi";
import {
  createWebCryptoFederationAbuseEvidenceProvider,
  createWebCryptoFederationSignatureProvider,
  openWebCryptoFederationAbuseEvidence,
} from "@absolutejs/secure-messaging-federation-webcrypto";

export type SecureMessagingFederationDemoResult = {
  readonly abuseEvidenceText: string;
  readonly abuseSenderAuthenticity: "receiver-asserted";
  readonly draftRevision: typeof MIMI_DRAFT_REVISIONS.protocol;
  readonly deliveryBridgeAuthenticated: true;
  readonly httpsBatchRoundTripped: true;
  readonly negotiatedMode: "strict-e2ee";
  readonly replayBlocked: true;
  readonly routingMetadataContainsSensitiveValue: false;
  readonly sessionAuthenticatedByBothDomains: true;
  readonly signatureSubstitutionBlocked: true;
};

const generateSignaturePair = () =>
  crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
    "verify",
  ]);

export const runSecureMessagingFederationDemo =
  async (): Promise<SecureMessagingFederationDemoResult> => {
    assertMimiDraftAdvertisement({
      ...MIMI_DRAFT_REVISIONS,
      encodingStatus: "draft-placeholder",
      identifierStatus: "notional",
      mutualTlsRequired: true,
    });
    const profile = createMimiDraftProfile({
      contentTypes: ["application/absolute-secure-message"],
      experimentalOptIn: MIMI_DRAFT_OPT_IN,
      features: ["opaque-route-v1"],
      maximumFrameBytes: 4_096,
    });
    const now = 1_000;
    const offer = (
      role: "initiator" | "responder",
      originDomain: string,
      destinationDomain: string,
    ): FederationOffer => ({
      contract: FEDERATION_CONTRACT,
      createdAt: now,
      destinationDomain,
      expiresAt: now + 1_000,
      offerId: `${role}-offer-1`,
      originDomain,
      profiles: [profile],
      role,
    });
    const initiatorOffer = offer("initiator", "alice.example", "bob.example");
    const responderOffer = offer("responder", "bob.example", "alice.example");
    const limits = {
      maximumClockSkewMs: 100,
      maximumFrameBytes: 4_096,
      maximumMessagesPerBatch: 25,
      maximumOfferTtlMs: 1_000,
      maximumTtlMs: 500,
    } as const;
    const transcript = await negotiateFederation({
      initiatorOffer,
      limits,
      now,
      preferredProfileIds: [profile.id],
      responderOffer,
      sessionId: "opaque-session-1",
    });

    const aliceKeys = await generateSignaturePair();
    const bobKeys = await generateSignaturePair();
    const publicKeys = new Map([
      ["alice.example:alice-signing-1", aliceKeys.publicKey],
      ["bob.example:bob-signing-1", bobKeys.publicKey],
    ]);
    const signatureProvider = (
      localDomain: "alice.example" | "bob.example",
      keyId: string,
      privateKey: CryptoKey,
    ) =>
      createWebCryptoFederationSignatureProvider({
        keyId,
        localDomain,
        privateKey,
        resolvePublicKey: async ({ domain, keyId: candidateKeyId }) =>
          publicKeys.get(`${domain}:${candidateKeyId}`),
      });
    const aliceSignatures = signatureProvider(
      "alice.example",
      "alice-signing-1",
      aliceKeys.privateKey,
    );
    const bobSignatures = signatureProvider(
      "bob.example",
      "bob-signing-1",
      bobKeys.privateKey,
    );
    const initiatorConfirmation = await confirmFederationTranscript({
      destinationDomain: "bob.example",
      domain: "alice.example",
      signatureProvider: aliceSignatures,
      transcript,
    });
    const responderConfirmation = await confirmFederationTranscript({
      destinationDomain: "alice.example",
      domain: "bob.example",
      signatureProvider: bobSignatures,
      transcript,
    });
    const verifier: FederationSignatureProvider = {
      ...bobSignatures,
      sign: async () => {
        throw new Error("The directory verifier cannot sign.");
      },
    };
    const session = await activateFederationSession({
      initiatorConfirmation,
      initiatorOffer,
      now,
      responderConfirmation,
      responderOffer,
      signatureProvider: verifier,
      transcript,
    });

    // In production, this is an opaque @absolutejs/secure-messaging MLS frame.
    // The verification code is intentionally absent from routing metadata.
    const opaqueMlsCiphertext = crypto.getRandomValues(new Uint8Array(64));
    const signed = await signFederationEnvelope({
      envelope: {
        contract: FEDERATION_CONTRACT,
        createdAt: now + 10,
        destinationDomain: "bob.example",
        expiresAt: now + 400,
        id: "federated-message-1",
        kind: "application",
        originDomain: "alice.example",
        payload: opaqueMlsCiphertext,
        routeId: "opaque-route-1",
        sessionId: session.sessionId,
        transcriptHash: session.transcriptHash,
      },
      limits,
      localDomain: "alice.example",
      now: now + 10,
      session,
      signatureProvider: aliceSignatures,
    });
    let claimed = false;
    const replayStore = {
      claim: async (): Promise<"claimed" | "duplicate"> => {
        if (claimed) return "duplicate";
        claimed = true;
        return "claimed";
      },
    };
    const httpsLimits = {
      maximumBatchBytes: 16_384,
      maximumBatchMessages: 25,
      maximumEnvelopeBytes: 8_192,
      maximumPayloadBytes: 4_096,
      maximumResponseBytes: 16_384,
      maximumSignatureBytes: 1_024,
      requestTimeoutMs: 5_000,
    } as const;
    const wireBatch = encodeFederationHttpsBatch([signed], httpsLimits);
    let queue = [...decodeFederationHttpsBatch(wireBatch, httpsLimits)];
    const transport = {
      id: "example.https-inbox",
      acknowledge: async () => {
        queue = [];
      },
      receive: async () => ({
        cursor: "cursor-1",
        messages: queue,
      }),
      send: async () => {
        throw new Error("This example transport is inbound-only.");
      },
    };
    const delivery = createFederatedDeliveryService({
      directory: {
        resolveInboundSession: async () => ({
          securityMode: "strict-e2ee",
          session,
        }),
        resolveOutboundRoute: async () => undefined,
        resolveVerifiedInboundRoute: async () => ({
          conversationId: "opaque-conversation-1",
          recipientDeviceId: "bob-device-1",
        }),
      },
      limits,
      localDomain: "bob.example",
      maximumMessagesPerReceive: 25,
      now: () => now + 20,
      replayStore,
      signatureProvider: verifier,
      transport,
    });
    const delivered = await delivery.receive({ deviceId: "bob-device-1" });
    if (delivered.messages[0]?.id !== signed.envelope.id)
      throw new Error("The authenticated delivery bridge lost the message.");
    let replayBlocked = false;
    await delivery.receive({ deviceId: "bob-device-1" }).catch(() => {
      replayBlocked = true;
    });
    if (!delivered.cursor) throw new Error("The transport omitted its cursor.");
    await delivery.acknowledge({
      cursor: delivered.cursor,
      deviceId: "bob-device-1",
    });

    let signatureSubstitutionBlocked = false;
    await verifier
      .verify({
        destinationDomain: "mallory.example",
        expectedDomain: "alice.example",
        payload: canonicalBytes(signed.envelope),
        purpose: "federation-envelope",
        signature: signed.signature,
      })
      .then((valid) => {
        signatureSubstitutionBlocked = !valid;
      });

    const moderationKeys = await crypto.subtle.generateKey(
      {
        hash: "SHA-256",
        modulusLength: 2048,
        name: "RSA-OAEP",
        publicExponent: Uint8Array.of(1, 0, 1),
      },
      false,
      ["encrypt", "decrypt"],
    );
    const authorization = {
      approvalId: "phishing-resistant-approval-1",
      method: "user-approved",
    } as const;
    const evidenceProvider = createWebCryptoFederationAbuseEvidenceProvider({
      createEvidenceId: () => "evidence-1",
      resolveRecipientPublicKey: async (keyId) =>
        keyId === "moderation-key-1" ? moderationKeys.publicKey : undefined,
    });
    const report = await createFederationAbuseReport({
      allegedSender: "alice-device-1",
      authorization,
      createdAt: now + 30,
      evidence: new TextEncoder().encode("User-selected private evidence"),
      evidenceProvider,
      expiresAt: now + 500,
      maximumEvidenceBytes: 1_024,
      maximumSealedEvidenceBytes: 4_096,
      maximumTtlMs: 1_000,
      messageIds: [signed.envelope.id],
      reason: "fraud",
      recipientKeyId: "moderation-key-1",
      reportId: "report-1",
      roomId: signed.envelope.routeId,
    });
    const openedEvidence = await openWebCryptoFederationAbuseEvidence({
      context: {
        allegedSender: report.allegedSender,
        authorization: report.authorization,
        messageIds: report.messageIds,
        recipientKeyId: report.evidence.recipientKeyId,
        reportId: report.reportId,
      },
      maximumSealedBytes: 4_096,
      privateKey: moderationKeys.privateKey,
      sealed: report.evidence.bytes,
    });
    const publicRoutingMetadata = JSON.stringify({
      destinationDomain: signed.envelope.destinationDomain,
      id: signed.envelope.id,
      kind: signed.envelope.kind,
      originDomain: signed.envelope.originDomain,
      routeId: signed.envelope.routeId,
      sessionId: signed.envelope.sessionId,
    });
    const routingMetadataContainsSensitiveValue =
      publicRoutingMetadata.includes("verification code") ||
      publicRoutingMetadata.includes("private evidence");
    if (
      session.profile.security.mode !== "strict-e2ee" ||
      report.evidence.senderAuthenticity !== "receiver-asserted" ||
      !replayBlocked ||
      !signatureSubstitutionBlocked ||
      routingMetadataContainsSensitiveValue
    )
      throw new Error("Federation safety invariant failed.");
    return Object.freeze({
      abuseEvidenceText: new TextDecoder().decode(openedEvidence),
      abuseSenderAuthenticity: "receiver-asserted",
      deliveryBridgeAuthenticated: true,
      draftRevision: MIMI_DRAFT_REVISIONS.protocol,
      httpsBatchRoundTripped: true,
      negotiatedMode: session.profile.security.mode,
      replayBlocked: true,
      routingMetadataContainsSensitiveValue: false,
      sessionAuthenticatedByBothDomains: true,
      signatureSubstitutionBlocked: true,
    });
  };
