import {
  createAgency,
  createMemoryAgencyStore,
  type PolicyDecisionPoint,
} from "@absolutejs/agency";
import {
  AgentExchangeError,
  agentExchangeMandateApprovalChallenge,
  createAgentExchangeReceiver,
  createAgentExchangeSender,
  createAgentExchangeStandingMandateAuthority,
  createMemoryAgentExchangeMandateStore,
  createMemoryAgentExchangeReplayStore,
  createMemoryAgentExchangeStore,
  type AgentExchangeMandateJwsSigner,
  type AgentExchangeMandateJwsVerifier,
  type AgentExchangeRequest,
  type AgentExchangeStandingMandateDraft,
} from "@absolutejs/agent-exchange";
import { createEmailVerificationCodeSource } from "@absolutejs/agent-exchange-email";
import {
  createAgentExchangeSecureMessagingHandler,
  createAgentExchangeSecureMessagingTransport,
  createMemoryAgentExchangeSecureMessagingReceiptStore,
} from "@absolutejs/agent-exchange-secure-messaging";
import { createWebAuthnAgentExchangeMandateApprovalProvider } from "@absolutejs/agent-exchange-webauthn";
import type {
  WebAuthnAdapter,
  WebAuthnCredential,
  WebAuthnCredentialStore,
} from "@absolutejs/auth";
import {
  createWebCryptoEnvelopeProvider,
  generateWebCryptoRecipientKeyPair,
} from "@absolutejs/e2ee-webcrypto";
import { createDemoMessagingPair } from "./secureMessaging";

const DEMO_CODE = "482193";
const JWS_TYPE = "absolute-agent-exchange-mandate+jws";

type DemoStep = {
  readonly detail: string;
  readonly name: string;
  readonly status: "passed";
};

export type SecureDelegationDemoResult = {
  readonly attacks: {
    readonly purposeSubstitution: "rejected";
    readonly replay: "rejected";
  };
  readonly mailboxReads: number;
  readonly modelObservedSecret: false;
  readonly receipt: {
    readonly exchangeId: string;
    readonly maximumUses: 1;
    readonly status: "submitted";
  };
  readonly secretPersisted: false;
  readonly steps: readonly DemoStep[];
  readonly submissions: number;
};

const encodeBase64Url = (value: Uint8Array): string =>
  Buffer.from(value).toString("base64url");
const decodeBase64Url = (value: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array([...Buffer.from(value, "base64url")]);

const sha256 = async (value: string): Promise<string> =>
  `sha256:${encodeBase64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )}`;

const createJws = async (): Promise<{
  readonly signer: AgentExchangeMandateJwsSigner;
  readonly verifier: AgentExchangeMandateJwsVerifier;
}> => {
  const keys = await crypto.subtle.generateKey({ name: "Ed25519" }, false, [
    "sign",
    "verify",
  ]);
  const signer: AgentExchangeMandateJwsSigner = {
    sign: async ({ payload, type }) => {
      const header = encodeBase64Url(
        new TextEncoder().encode(
          JSON.stringify({ alg: "EdDSA", kid: "demo-owner-key", typ: type }),
        ),
      );
      const encodedPayload = encodeBase64Url(payload);
      const signingInput = new TextEncoder().encode(
        `${header}.${encodedPayload}`,
      );
      const signature = await crypto.subtle.sign(
        "Ed25519",
        keys.privateKey,
        signingInput,
      );
      return `${header}.${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
    },
  };
  const verifier: AgentExchangeMandateJwsVerifier = {
    verify: async ({ compactJws, type }) => {
      const parts = compactJws.split(".");
      if (parts.length !== 3) throw new Error("Invalid compact JWS.");
      const [headerPart, payloadPart, signaturePart] = parts;
      if (
        headerPart === undefined ||
        payloadPart === undefined ||
        signaturePart === undefined
      ) {
        throw new Error("Invalid compact JWS.");
      }
      const header = JSON.parse(
        new TextDecoder().decode(decodeBase64Url(headerPart)),
      ) as unknown;
      if (
        typeof header !== "object" ||
        header === null ||
        !("alg" in header) ||
        !("kid" in header) ||
        !("typ" in header) ||
        header.alg !== "EdDSA" ||
        header.kid !== "demo-owner-key" ||
        header.typ !== type
      ) {
        throw new Error("Untrusted JWS header.");
      }
      const valid = await crypto.subtle.verify(
        "Ed25519",
        keys.publicKey,
        decodeBase64Url(signaturePart),
        new TextEncoder().encode(`${headerPart}.${payloadPart}`),
      );
      if (!valid) throw new Error("Invalid compact JWS signature.");
      return {
        algorithm: "EdDSA",
        keyId: "demo-owner-key",
        payload: decodeBase64Url(payloadPart),
      };
    },
  };
  return { signer, verifier };
};

const approvalPolicy = (): PolicyDecisionPoint => ({
  evaluate: ({ approval, now }) =>
    approval === undefined
      ? {
          decisionId: "decision-standing-mandate-required",
          evaluatedAt: now,
          kind: "deny",
          prerequisites: [],
          reason: "A verified standing mandate is required.",
          requestable: true,
        }
      : {
          decisionId: "decision-standing-mandate-accepted",
          evaluatedAt: now,
          kind: "allow",
        },
});

const errorCode = async (
  operation: () => Promise<unknown>,
): Promise<string> => {
  try {
    await operation();
    return "accepted";
  } catch (error) {
    return error instanceof AgentExchangeError ? error.code : "rejected";
  }
};

export const runSecureDelegationDemo =
  async (): Promise<SecureDelegationDemoResult> => {
    const now = Date.now();
    const messaging = await createDemoMessagingPair(now);
    const steps: DemoStep[] = [];
    const issuer = {
      authority: "https://owner.example",
      subject: "mailbox-owner",
    };
    const requester = {
      agentId: "requesting-agent",
      authority: "https://requester.example",
      delegationId: "oauth-delegation-requesting-agent",
      deviceId: messaging.requesterDeviceId,
      subject: "requesting-person",
    };
    const audience = {
      agentId: "recipient-agent",
      authority: "https://recipient.example",
      deviceId: messaging.recipientDeviceId,
      subject: "mailbox-owner",
    };
    const { signer, verifier } = await createJws();
    const mandateAuthority = createAgentExchangeStandingMandateAuthority({
      now: () => now,
      signer,
      store: createMemoryAgentExchangeMandateStore(),
      verifier,
    });
    const mandateDraft: AgentExchangeStandingMandateDraft = {
      audience,
      expiresAt: now + 24 * 60 * 60_000,
      grants: [
        {
          accountRef: "mailbox-account-1",
          operation: "verification.submit",
          origin: "https://accounts.example.com",
          provider: "gmail",
          purpose: "email.verification.submit",
          risk: "authentication",
          secretKind: "email-one-time-code",
        },
      ],
      issuer,
      mandateId: "mandate-email-code-demo",
      maximumUses: 1,
      notBefore: now,
      requester,
    };
    const credential: WebAuthnCredential = {
      counter: 4,
      createdAt: now - 86_400_000,
      credentialId: "synthetic-passkey-credential",
      publicKey: "synthetic-public-key",
      userId: issuer.subject,
    };
    const credentialStore: WebAuthnCredentialStore = {
      getCredential: async (credentialId) =>
        credentialId === credential.credentialId ? credential : undefined,
      listCredentialsByUser: async (userId) =>
        userId === credential.userId ? [credential] : [],
      removeCredential: async () => {},
      saveCredential: async (value) => {
        Object.assign(credential, value);
      },
    };
    const webauthnAdapter: WebAuthnAdapter = {
      createAuthenticationOptions: async (input) => ({
        challenge: input.challenge ?? "",
        options: {
          allowCredentials: input.allowCredentials,
          rpId: input.rpId,
          userVerification: input.userVerification,
        },
      }),
      createRegistrationOptions: async () => ({
        challenge: "unused",
        options: {},
      }),
      verifyAuthentication: async (input) => {
        const response = input.response as { readonly id?: unknown };
        return {
          newCounter: input.credential.counter + 1,
          verified:
            input.expectedChallenge ===
              (await agentExchangeMandateApprovalChallenge(mandateDraft)) &&
            input.expectedOrigin === issuer.authority &&
            input.expectedRPID === "owner.example" &&
            input.requireUserVerification === true &&
            response.id === credential.credentialId,
        };
      },
      verifyRegistration: async () => ({ verified: false }),
    };
    const approvalProvider = createWebAuthnAgentExchangeMandateApprovalProvider(
      {
        adapter: webauthnAdapter,
        credentialStore,
        now: () => now,
        origin: issuer.authority,
        resolveUserId: ({ subject }) => subject,
        rpId: "owner.example",
      },
    );
    const challenge = await agentExchangeMandateApprovalChallenge(mandateDraft);
    await approvalProvider.begin({
      challenge,
      draft: mandateDraft,
      subject: issuer.subject,
      verifierOrigin: issuer.authority,
    });
    const verifiedApproval = await approvalProvider.verify({
      challenge,
      draft: mandateDraft,
      response: { id: credential.credentialId },
      subject: issuer.subject,
      verifierOrigin: issuer.authority,
    });
    const issued = await mandateAuthority.issue({
      ...mandateDraft,
      approval: {
        credentialIdHash: await sha256(verifiedApproval.credentialId),
        method: "webauthn-verifier-bound",
        rpId: verifiedApproval.rpId,
        userVerified: verifiedApproval.userVerified,
        verifiedAt: now,
        verifierOrigin: verifiedApproval.verifierOrigin,
      },
    });
    steps.push({
      detail:
        "User-verified approval was bound to an exact Ed25519-signed mandate.",
      name: "Passkey enrollment",
      status: "passed",
    });

    const agency = createAgency({
      now: () => now,
      policy: approvalPolicy(),
      store: createMemoryAgencyStore(),
    });
    const recipientKeys = await generateWebCryptoRecipientKeyPair();
    const e2ee = createWebCryptoEnvelopeProvider({
      resolveRecipientPrivateKey: async (handle) =>
        handle === "recipient-key" ? recipientKeys.keyMaterial : undefined,
    });
    let mailboxReads = 0;
    let submissions = 0;
    let sourceBytes: Uint8Array | undefined;
    const emailSource = createEmailVerificationCodeSource({
      lookup: {
        find: (input) => {
          mailboxReads += 1;
          return Promise.resolve([
            {
              accountEmail: input.accountEmail,
              authenticationResults: [
                "mx.mailbox.example; dmarc=pass header.from=example.com",
              ],
              bodyText: `Challenge challenge-demo. Your verification code: ${DEMO_CODE}.`,
              direction: "inbound",
              from: { address: "security@example.com" },
              id: "synthetic-email-message",
              occurredAt: new Date(now - 1_000),
              provider: "gmail",
              subject: "Sign in to Example",
              to: [{ address: input.accountEmail }],
            },
          ]);
        },
      },
      now: () => now,
      profiles: [
        {
          bodyMarkers: ["verification code"],
          correlation: { mode: "challenge-text" },
          id: "accounts-example-six-digit-v1",
          operations: ["verification.submit"],
          origins: ["https://accounts.example.com"],
          providers: ["gmail"],
          senderAddresses: ["security@example.com"],
          senderAuthentication: {
            allowedHeaderFromDomains: ["example.com"],
            trustedAuthservIds: ["mx.mailbox.example"],
          },
          subjectIncludesAny: ["sign in"],
        },
      ],
      resolveAccountEmail: () => "owner@example.net",
    });
    const receiver = createAgentExchangeReceiver({
      consent: {
        assertAllows: (request) => ({
          consentId: `paired:${request.requester.agentId}:${request.recipient.agentId}`,
          expiresAt: request.expiresAt,
        }),
      },
      e2ee,
      now: () => now,
      replay: createMemoryAgentExchangeReplayStore(),
      sink: {
        submit: ({ plaintext }) => {
          if (new TextDecoder().decode(plaintext) !== DEMO_CODE) {
            throw new Error("Synthetic destination rejected the code.");
          }
          submissions += 1;
          return {
            reference: "synthetic-verification-form",
            status: "submitted",
          };
        },
      },
    });
    const authorizedExchanges = new Set<string>();
    const transportReceipts =
      createMemoryAgentExchangeSecureMessagingReceiptStore();
    const recipientHandler = createAgentExchangeSecureMessagingHandler({
      authorizeRequest: ({ delivery, signedMandate }) => {
        if (
          !authorizedExchanges.has(delivery.request.exchangeId) ||
          signedMandate?.compactJws !== issued.signedMandate.compactJws
        )
          throw new Error("The encrypted delivery was not mandate-authorized.");
      },
      localDeviceId: messaging.recipientDeviceId,
      maximumTtlMs: 60_000,
      now: () => now,
      receipts: transportReceipts,
      receiver,
    });
    const requesterHandler = createAgentExchangeSecureMessagingHandler({
      authorizeRequest: () => {
        throw new Error("A receipt cannot request execution.");
      },
      localDeviceId: messaging.requesterDeviceId,
      maximumTtlMs: 60_000,
      now: () => now,
      receipts: transportReceipts,
      receiver: {
        receive: async () => {
          throw new Error("A receipt cannot contain a protected value.");
        },
      },
    });
    let draining = false;
    const transport = createAgentExchangeSecureMessagingTransport({
      client: messaging.requester,
      maximumTtlMs: 60_000,
      now: () => now,
      pollIntervalMs: 1,
      receipts: transportReceipts,
      resolveRoute: () => ({
        conversationId: messaging.conversationId,
        recipientDeviceId: messaging.recipientDeviceId,
      }),
      resolveSignedMandate: () => issued.signedMandate,
      sleep: async () => {
        if (draining) return;
        draining = true;
        try {
          await messaging.recipient.receiveAndHandle(recipientHandler);
          await messaging.requester.receiveAndHandle(requesterHandler);
        } finally {
          draining = false;
        }
      },
    });
    const sender = createAgentExchangeSender({
      agency,
      e2ee,
      keyDirectory: {
        resolve: () => ({
          keyId: "recipient-key",
          publicKey: recipientKeys.publicKey,
        }),
      },
      now: () => now,
      source: {
        read: async (request) => {
          const sensitive = await emailSource.read(request);
          sourceBytes = sensitive.bytes;
          return sensitive;
        },
      },
      store: createMemoryAgentExchangeStore(),
      transport,
    });
    const requested = await sender.request({
      assurance: {
        approval: "standing-mandate",
        credential: "token-confined-broker",
        execution: "purpose-bound",
      },
      expiresAt: now + 60_000,
      idempotencyKey: "secure-agent-delegation-demo",
      mandateId: issued.mandate.mandateId,
      purpose: "email.verification.submit",
      recipient: audience,
      requester,
      resource: {
        accountRef: "mailbox-account-1",
        challengeId: "challenge-demo",
        operation: "verification.submit",
        origin: "https://accounts.example.com",
        provider: "gmail",
      },
      risk: "authentication",
      secretKind: "email-one-time-code",
    });

    const changedRequest: AgentExchangeRequest = {
      ...requested.exchange,
      exchangeId: "xchg-purpose-substitution",
      nonce: "nonce-purpose-substitution",
      purpose: "account.recovery",
    };
    const substitution = await errorCode(() =>
      mandateAuthority.authorize({
        expectedIssuer: issuer,
        request: changedRequest,
        signedMandate: issued.signedMandate,
      }),
    );
    if (substitution !== "mandate_invalid") {
      throw new Error("Purpose substitution was not rejected.");
    }
    steps.push({
      detail: "A changed purpose was rejected before mailbox access.",
      name: "Phishing probe",
      status: "passed",
    });

    await mandateAuthority.authorize({
      expectedIssuer: issuer,
      request: requested.exchange,
      signedMandate: issued.signedMandate,
    });
    authorizedExchanges.add(requested.exchange.exchangeId);
    await agency.approve({
      actionId: requested.exchange.actionId,
      approvedBy: issuer.subject,
      approvedUntil: requested.exchange.expiresAt,
      conditions: { mandateId: issued.mandate.mandateId },
    });
    steps.push({
      detail:
        "Issuer, agent delegation, audience, grant, expiry, and use limit matched.",
      name: "Mandate authorization",
      status: "passed",
    });

    const lease = await sender.issueLease(requested.exchange.exchangeId);
    const completed = await sender.execute({
      exchangeId: requested.exchange.exchangeId,
      leaseId: lease.leaseId,
    });
    steps.push({
      detail:
        "The code crossed HPKE inside a device-bound strict-E2EE MLS request/receipt exchange.",
      name: "Model-blind delivery",
      status: "passed",
    });

    const replay = await errorCode(() =>
      mandateAuthority.authorize({
        expectedIssuer: issuer,
        request: requested.exchange,
        signedMandate: issued.signedMandate,
      }),
    );
    if (replay !== "replay_detected") {
      throw new Error("Mandate replay was not rejected.");
    }
    steps.push({
      detail:
        "The consumed exchange ID could not authorize a second execution.",
      name: "Replay probe",
      status: "passed",
    });

    if (
      sourceBytes === undefined ||
      sourceBytes.some((value) => value !== 0) ||
      mailboxReads !== 1 ||
      submissions !== 1
    ) {
      throw new Error("Sensitive-value lifecycle invariant failed.");
    }
    const result: SecureDelegationDemoResult = {
      attacks: { purposeSubstitution: "rejected", replay: "rejected" },
      mailboxReads,
      modelObservedSecret: false,
      receipt: {
        exchangeId: completed.receipt.exchangeId,
        maximumUses: completed.receipt.maximumUses,
        status: completed.receipt.status,
      },
      secretPersisted: false,
      steps,
      submissions,
    };
    if (JSON.stringify(result).includes(DEMO_CODE)) {
      throw new Error("The public result leaked the protected value.");
    }
    return Object.freeze(result);
  };
