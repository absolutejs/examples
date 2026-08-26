import {
  createAgency,
  createMemoryAgencyStore,
  type PolicyDecisionPoint,
} from "@absolutejs/agency";
import {
  agentExchangeApprovalChallenge,
  agentExchangeMandateApprovalChallenge,
  createAgentExchangeReceiver,
  createAgentExchangeSender,
  createAgentExchangeStandingMandateAuthority,
  createMemoryAgentExchangeReplayStore,
  createMemoryAgentExchangeStore,
  type AgentExchangeMandateRegistration,
  type AgentExchangeMandateStore,
  type AgentExchangeReceipt,
  type AgentExchangeRequest,
  type AgentExchangeSender,
  type AgentExchangeStandingMandate,
  type AgentExchangeStandingMandateDraft,
  type SignedAgentExchangeStandingMandate,
} from "@absolutejs/agent-exchange";
import { createAgentExchangeDestinationRegistry } from "@absolutejs/agent-exchange-destinations";
import { createAgentExchangeHttpDestination } from "@absolutejs/agent-exchange-http-destination";
import {
  createWebCryptoMandateJwsSigner,
  createWebCryptoMandateJwsVerifier,
} from "@absolutejs/agent-exchange-mandate-webcrypto";
import {
  createHardenedOAuthAuthorizationClient,
  decodeOAuthGrant,
  encodeOAuthGrant,
  redeemOAuthGrant,
} from "@absolutejs/agent-exchange-oauth";
import { createMemoryOAuthAuthorizationSessionStore } from "@absolutejs/agent-exchange-oauth-stores";
import { createWebCryptoDpopProofSigner } from "@absolutejs/agent-exchange-oauth-webcrypto";
import {
  createWebAuthnAgentExchangeApprovalProvider,
  createWebAuthnAgentExchangeMandateApprovalProvider,
} from "@absolutejs/agent-exchange-webauthn";
import {
  createInMemoryWebAuthnCredentialStore,
  type WebAuthnAdapter,
  type WebAuthnCredentialStore,
} from "@absolutejs/auth";
import {
  createWebCryptoEnvelopeProvider,
  generateWebCryptoRecipientKeyPair,
} from "@absolutejs/e2ee-webcrypto";
import {
  createMockAuthorizationServer,
  DEMO_OAUTH_PROFILE,
  type MockAuthorizationServer,
} from "./mockAuthorizationServer";

const USER_ID = "demo-owner";
const SESSION_TTL_MS = 10 * 60_000;
const EXCHANGE_TTL_MS = 2 * 60_000;
const MANDATE_TTL_MS = 15 * 60_000;
const MANDATE_MAXIMUM_USES = 3;
const MANDATE_KEY_ID = "demo-standing-mandate-key";

type DemoSession = {
  readonly expiresAt: number;
  readonly origin: string;
  readonly rpId: string;
  registrationChallenge?: string;
};

type PendingFlow = {
  readonly authorizationServer: MockAuthorizationServer;
  readonly sender: AgentExchangeSender;
};

type PendingEmailFlow = {
  readonly approval: ReturnType<
    typeof createWebAuthnAgentExchangeApprovalProvider
  >;
  readonly challenge: string;
  readonly request: AgentExchangeRequest;
};

type PendingMandateFlow = {
  readonly approval: ReturnType<
    typeof createWebAuthnAgentExchangeMandateApprovalProvider
  >;
  readonly challenge: string;
  readonly draft: AgentExchangeStandingMandateDraft;
};

type ActiveMandate = {
  readonly mandate: AgentExchangeStandingMandate;
  readonly signedMandate: SignedAgentExchangeStandingMandate;
};

type DemoMandateRecord = AgentExchangeMandateRegistration & {
  readonly exchanges: Set<string>;
  revoked: boolean;
  uses: number;
};

type DemoMandateStore = AgentExchangeMandateStore & {
  readonly remaining: (mandateId: string) => number;
};

export type SafeExchangeResult = {
  readonly assurance: AgentExchangeReceipt["assurance"];
  readonly completedAt: number;
  readonly exchangeId: string;
  readonly maximumUses: 1;
  readonly modelObservedSecret: false;
  readonly processingMode: "tool-confined";
  readonly protocol: ReturnType<MockAuthorizationServer["protocolEvidence"]>;
  readonly reference?: string;
  readonly status: "submitted";
};

export type SafeEmailExchangeResult = {
  readonly assuranceMode: "passkey-approved-bearer-secret";
  readonly exchangeId: string;
  readonly maximumUses: 1;
  readonly modelObservedSecret: false;
  readonly processingMode: "tool-confined";
  readonly reference?: string;
  readonly status: "submitted";
};

export type StandingMandateResult = {
  readonly expiresAt: number;
  readonly mandateId: string;
  readonly maximumUses: number;
  readonly status: "authorized";
  readonly usesRemaining: number;
};

export type StandingMandateExecutionResult = Omit<
  SafeEmailExchangeResult,
  "assuranceMode"
> & {
  readonly assuranceMode: "passkey-enrolled-standing-mandate";
  readonly mandateId: string;
  readonly usesRemaining: number;
};

const createDemoMandateStore = (): DemoMandateStore => {
  const records = new Map<string, DemoMandateRecord>();
  return Object.freeze({
    consume: async ({ exchangeId, mandateId, now }) => {
      const record = records.get(mandateId);
      if (record === undefined || now >= record.expiresAt) return "unknown";
      if (record.revoked) return "revoked";
      if (record.exchanges.has(exchangeId)) return "replay";
      if (record.uses >= record.maximumUses) return "exhausted";
      record.exchanges.add(exchangeId);
      record.uses += 1;
      return "consumed";
    },
    register: async (registration) => {
      if (records.has(registration.mandateId)) return false;
      records.set(registration.mandateId, {
        ...registration,
        exchanges: new Set(),
        revoked: false,
        uses: 0,
      });
      return true;
    },
    remaining: (mandateId) => {
      const record = records.get(mandateId);
      return record === undefined
        ? 0
        : Math.max(0, record.maximumUses - record.uses);
    },
    revoke: async ({ issuer, mandateId }) => {
      const record = records.get(mandateId);
      if (
        record === undefined ||
        record.issuer.authority !== issuer.authority ||
        record.issuer.subject !== issuer.subject
      )
        return false;
      record.revoked = true;
      return true;
    },
  });
};

const credentialIdHash = async (credentialId: string): Promise<string> => {
  const bytes = new TextEncoder().encode(
    `org.absolutejs.agent-exchange.webauthn-credential.v1\u0000${credentialId}`,
  );
  return Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString(
    "base64url",
  );
};

const approvalPolicy = (): PolicyDecisionPoint => ({
  evaluate: ({ approval, now }) =>
    approval === undefined
      ? {
          decisionId: `decision_${crypto.randomUUID()}`,
          evaluatedAt: now,
          kind: "deny",
          prerequisites: [
            {
              kind: "consent",
              prerequisiteId: "requester-passkey",
              title: "Approve this exact agent action with your passkey",
            },
          ],
          reason: "Verifier-bound user approval is required.",
          requestable: true,
        }
      : {
          decisionId: `decision_${crypto.randomUUID()}`,
          evaluatedAt: now,
          kind: "allow",
        },
});

const validDemoOrigin = (value: string): { origin: string; rpId: string } => {
  const url = new URL(value);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
    url.origin !== value
  )
    throw new Error("The demo requires HTTPS or an explicit localhost origin.");
  return { origin: url.origin, rpId: url.hostname };
};

export const createExchangeDemo = (adapter: WebAuthnAdapter) => {
  const sessions = new Map<string, DemoSession>();
  const flows = new Map<string, PendingFlow>();
  const emailFlows = new Map<string, PendingEmailFlow>();
  const mandateFlows = new Map<string, PendingMandateFlow>();
  const activeMandates = new Map<string, ActiveMandate>();
  const credentialStore: WebAuthnCredentialStore =
    createInMemoryWebAuthnCredentialStore();
  const mandateStore = createDemoMandateStore();
  const mandateAuthority = (async () => {
    const generatedKey = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign", "verify"],
    );
    if (!("privateKey" in generatedKey))
      throw new Error("The mandate signing key could not be created.");
    return createAgentExchangeStandingMandateAuthority({
      allowInsecureLocalhost: true,
      signer: createWebCryptoMandateJwsSigner({
        keyId: MANDATE_KEY_ID,
        privateKey: generatedKey.privateKey,
      }),
      store: mandateStore,
      verifier: createWebCryptoMandateJwsVerifier({
        keys: {
          resolve: ({ keyId }) => {
            if (keyId !== MANDATE_KEY_ID)
              throw new Error("The mandate signing key is not trusted.");
            return generatedKey.publicKey;
          },
        },
      }),
    });
  })();

  const session = (token: string, origin: string): DemoSession => {
    const value = sessions.get(token);
    if (
      value === undefined ||
      value.expiresAt <= Date.now() ||
      value.origin !== origin
    )
      throw new Error("Demo session expired or changed origin.");
    return value;
  };

  const approvalFor = (activeSession: DemoSession) =>
    createWebAuthnAgentExchangeApprovalProvider({
      adapter,
      allowInsecureLocalhost: true,
      credentialStore,
      origin: activeSession.origin,
      resolveUserId: () => USER_ID,
      rpId: activeSession.rpId,
    });

  const mandateApprovalFor = (activeSession: DemoSession) =>
    createWebAuthnAgentExchangeMandateApprovalProvider({
      adapter,
      allowInsecureLocalhost: true,
      credentialStore,
      origin: activeSession.origin,
      resolveUserId: () => USER_ID,
      rpId: activeSession.rpId,
    });

  const emailDestinations = createAgentExchangeDestinationRegistry([
    createAgentExchangeHttpDestination({
      authorization: () => "Bearer demo-destination-credential",
      challengeField: "challenge",
      endpoint: "https://accounts.example.com/api/verify",
      fetcher: async (url, init) => {
        const headers = new Headers(init?.headers);
        if (
          String(url) !== "https://accounts.example.com/api/verify" ||
          headers.get("authorization") !==
            "Bearer demo-destination-credential" ||
          new TextDecoder().decode(init?.body as Uint8Array) !==
            "code=482193&challenge=challenge-demo"
        )
          throw new Error("The fixed demo destination rejected the request.");
        return new Response(null, { status: 204 });
      },
      id: "accounts-example",
      operations: ["verification.submit"],
      reference: "accounts-example:accepted",
    }),
  ]);

  return Object.freeze({
    approveStandingMandate: async (input: {
      readonly mandateId: string;
      readonly origin: string;
      readonly response: unknown;
      readonly sessionToken: string;
    }): Promise<StandingMandateResult> => {
      session(input.sessionToken, input.origin);
      const flow = mandateFlows.get(input.mandateId);
      if (flow === undefined)
        throw new Error("Mandate enrollment expired or was already used.");
      mandateFlows.delete(input.mandateId);
      const verified = await flow.approval.verify({
        challenge: flow.challenge,
        draft: flow.draft,
        response: input.response,
        subject: USER_ID,
        verifierOrigin: input.origin,
      });
      const authority = await mandateAuthority;
      const issued = await authority.issue({
        ...flow.draft,
        approval: {
          credentialIdHash: await credentialIdHash(verified.credentialId),
          method: "webauthn-verifier-bound",
          rpId: verified.rpId,
          userVerified: true,
          verifiedAt: Date.now(),
          verifierOrigin: verified.verifierOrigin,
        },
      });
      activeMandates.set(input.mandateId, issued);
      return Object.freeze({
        expiresAt: issued.mandate.expiresAt,
        mandateId: issued.mandate.mandateId,
        maximumUses: issued.mandate.maximumUses,
        status: "authorized" as const,
        usesRemaining: mandateStore.remaining(input.mandateId),
      });
    },

    approve: async (input: {
      readonly exchangeId: string;
      readonly origin: string;
      readonly response: unknown;
      readonly sessionToken: string;
    }): Promise<SafeExchangeResult> => {
      session(input.sessionToken, input.origin);
      const flow = flows.get(input.exchangeId);
      if (flow === undefined)
        throw new Error("Exchange expired or was already used.");
      flows.delete(input.exchangeId);

      await flow.sender.approve({
        exchangeId: input.exchangeId,
        response: input.response,
      });
      const lease = await flow.sender.issueLease(input.exchangeId);
      const completed = await flow.sender.execute({
        exchangeId: input.exchangeId,
        leaseId: lease.leaseId,
      });
      const result: SafeExchangeResult = Object.freeze({
        ...completed.receipt,
        protocol: flow.authorizationServer.protocolEvidence(),
      });
      flow.authorizationServer.assertPublicValue(result);
      return result;
    },

    approveEmailExchange: async (input: {
      readonly exchangeId: string;
      readonly origin: string;
      readonly response: unknown;
      readonly sessionToken: string;
    }): Promise<SafeEmailExchangeResult> => {
      session(input.sessionToken, input.origin);
      const flow = emailFlows.get(input.exchangeId);
      if (flow === undefined)
        throw new Error("Email exchange expired or was already used.");
      emailFlows.delete(input.exchangeId);
      await flow.approval.verify({
        challenge: flow.challenge,
        request: flow.request,
        response: input.response,
        subject: USER_ID,
        verifierOrigin: input.origin,
      });
      const plaintext = new TextEncoder().encode("482193");
      try {
        const submitted = await emailDestinations.submit({
          plaintext,
          request: flow.request,
          tenantId: USER_ID,
        });
        return Object.freeze({
          assuranceMode: "passkey-approved-bearer-secret" as const,
          exchangeId: flow.request.exchangeId,
          maximumUses: 1 as const,
          modelObservedSecret: false as const,
          processingMode: "tool-confined" as const,
          ...(submitted.reference === undefined
            ? {}
            : { reference: submitted.reference }),
          status: "submitted" as const,
        });
      } finally {
        plaintext.fill(0);
      }
    },

    beginEmailExchange: async (input: {
      readonly origin: string;
      readonly sessionToken: string;
    }) => {
      const activeSession = session(input.sessionToken, input.origin);
      if ((await credentialStore.listCredentialsByUser(USER_ID)).length === 0)
        throw new Error("Register a passkey before requesting an exchange.");
      const now = Date.now();
      const exchangeId = `email_${crypto.randomUUID()}`;
      const request = Object.freeze({
        actionId: `action_${crypto.randomUUID()}`,
        assurance: {
          approval: "webauthn-verifier-bound",
          credential: "token-confined-broker",
          execution: "purpose-bound",
        },
        createdAt: now,
        exchangeId,
        expiresAt: now + EXCHANGE_TTL_MS,
        idempotencyKey: crypto.randomUUID(),
        maximumUses: 1,
        nonce: crypto.randomUUID(),
        processingMode: "tool-confined",
        purpose: "Retrieve and submit one correlated email verification code",
        recipient: {
          agentId: "recipient-mailbox-agent",
          authority: activeSession.origin,
          subject: USER_ID,
        },
        requester: {
          agentId: "requester-agent",
          authority: activeSession.origin,
          subject: USER_ID,
        },
        resource: {
          accountRef: "mailbox:demo-owner",
          challengeId: "challenge-demo",
          operation: "verification.submit",
          origin: "https://accounts.example.com",
          provider: "gmail",
        },
        risk: "authentication",
        secretKind: "email-one-time-code",
      } satisfies AgentExchangeRequest);
      const approval = approvalFor(activeSession);
      const challenge = await agentExchangeApprovalChallenge(request);
      const begun = await approval.begin({
        challenge,
        request,
        subject: USER_ID,
        verifierOrigin: activeSession.origin,
      });
      emailFlows.set(exchangeId, { approval, challenge, request });
      return Object.freeze({ exchangeId, options: begun.options });
    },

    beginStandingMandate: async (input: {
      readonly origin: string;
      readonly sessionToken: string;
    }) => {
      const activeSession = session(input.sessionToken, input.origin);
      if ((await credentialStore.listCredentialsByUser(USER_ID)).length === 0)
        throw new Error("Register a passkey before authorizing a mandate.");
      const now = Date.now();
      const mandateId = `mandate_${crypto.randomUUID()}`;
      const draft: AgentExchangeStandingMandateDraft = Object.freeze({
        audience: {
          agentId: "recipient-mailbox-agent",
          authority: activeSession.origin,
          subject: USER_ID,
        },
        expiresAt: now + MANDATE_TTL_MS,
        grants: [
          {
            accountRef: "mailbox:demo-owner",
            operation: "verification.submit",
            origin: "https://accounts.example.com",
            provider: "gmail",
            purpose:
              "Retrieve and submit one correlated email verification code",
            risk: "authentication",
            secretKind: "email-one-time-code",
          },
        ],
        issuer: { authority: activeSession.origin, subject: USER_ID },
        mandateId,
        maximumUses: MANDATE_MAXIMUM_USES,
        notBefore: now,
        requester: {
          agentId: "requester-agent",
          authority: activeSession.origin,
          delegationId: "demo-oauth-delegation",
          subject: USER_ID,
        },
      });
      const approval = mandateApprovalFor(activeSession);
      const challenge = await agentExchangeMandateApprovalChallenge(draft);
      const begun = await approval.begin({
        challenge,
        draft,
        subject: USER_ID,
        verifierOrigin: activeSession.origin,
      });
      mandateFlows.set(mandateId, { approval, challenge, draft });
      return Object.freeze({ mandateId, options: begun.options });
    },

    executeStandingMandate: async (input: {
      readonly mandateId: string;
      readonly origin: string;
      readonly sessionToken: string;
    }): Promise<StandingMandateExecutionResult> => {
      const activeSession = session(input.sessionToken, input.origin);
      const active = activeMandates.get(input.mandateId);
      if (active === undefined)
        throw new Error("The standing mandate is unavailable.");
      const now = Date.now();
      const exchangeId = `standing_${crypto.randomUUID()}`;
      const request = Object.freeze({
        actionId: `action_${crypto.randomUUID()}`,
        assurance: {
          approval: "standing-mandate",
          credential: "token-confined-broker",
          execution: "purpose-bound",
        },
        createdAt: now,
        exchangeId,
        expiresAt: Math.min(now + EXCHANGE_TTL_MS, active.mandate.expiresAt),
        idempotencyKey: crypto.randomUUID(),
        mandateId: input.mandateId,
        maximumUses: 1,
        nonce: crypto.randomUUID(),
        processingMode: "tool-confined",
        purpose: "Retrieve and submit one correlated email verification code",
        recipient: active.mandate.audience,
        requester: active.mandate.requester,
        resource: {
          accountRef: "mailbox:demo-owner",
          challengeId: "challenge-demo",
          operation: "verification.submit",
          origin: "https://accounts.example.com",
          provider: "gmail",
        },
        risk: "authentication",
        secretKind: "email-one-time-code",
      } satisfies AgentExchangeRequest);
      await (
        await mandateAuthority
      ).authorize({
        expectedIssuer: active.mandate.issuer,
        request,
        signedMandate: active.signedMandate,
      });
      const plaintext = new TextEncoder().encode("482193");
      try {
        const submitted = await emailDestinations.submit({
          plaintext,
          request,
          tenantId: activeSession.origin,
        });
        return Object.freeze({
          assuranceMode: "passkey-enrolled-standing-mandate" as const,
          exchangeId,
          mandateId: input.mandateId,
          maximumUses: 1 as const,
          modelObservedSecret: false as const,
          processingMode: "tool-confined" as const,
          ...(submitted.reference === undefined
            ? {}
            : { reference: submitted.reference }),
          status: "submitted" as const,
          usesRemaining: mandateStore.remaining(input.mandateId),
        });
      } finally {
        plaintext.fill(0);
      }
    },

    revokeStandingMandate: async (input: {
      readonly mandateId: string;
      readonly origin: string;
      readonly sessionToken: string;
    }) => {
      session(input.sessionToken, input.origin);
      const active = activeMandates.get(input.mandateId);
      if (active === undefined)
        throw new Error("The standing mandate is unavailable.");
      const revoked = await (
        await mandateAuthority
      ).revoke({
        issuer: active.mandate.issuer,
        mandateId: input.mandateId,
      });
      return Object.freeze({ mandateId: input.mandateId, revoked });
    },

    beginExchange: async (input: {
      readonly origin: string;
      readonly sessionToken: string;
    }) => {
      const activeSession = session(input.sessionToken, input.origin);
      const existingCredentials =
        await credentialStore.listCredentialsByUser(USER_ID);
      if (existingCredentials.length === 0)
        throw new Error("Register a passkey before requesting an exchange.");

      const authorizationServer = createMockAuthorizationServer();
      const oauthClient = createHardenedOAuthAuthorizationClient({
        fetch: authorizationServer.fetch,
        profile: DEMO_OAUTH_PROFILE,
        sessionStore: createMemoryOAuthAuthorizationSessionStore(),
      });
      const recipientKeys = await generateWebCryptoRecipientKeyPair();
      const keyHandle = `recipient_${crypto.randomUUID()}`;
      const envelope = createWebCryptoEnvelopeProvider({
        maxPlaintextBytes: 16 * 1024,
        resolveRecipientPrivateKey: async (handle) =>
          handle === keyHandle ? recipientKeys.keyMaterial : undefined,
      });
      const dpop = await createWebCryptoDpopProofSigner();
      const receiver = createAgentExchangeReceiver({
        allowInsecureLocalhost: true,
        consent: {
          assertAllows: (request) => ({
            consentId: `paired:${request.requester.agentId}:${request.recipient.agentId}`,
            expiresAt: request.expiresAt,
          }),
        },
        e2ee: envelope,
        replay: createMemoryAgentExchangeReplayStore(),
        sink: {
          submit: async ({ plaintext, request }) => {
            const grant = decodeOAuthGrant(plaintext);
            const submitted = await redeemOAuthGrant({
              dpop,
              execute: async ({ accessToken, createDpopProof }) => {
                const response = await authorizationServer.fetch(
                  DEMO_OAUTH_PROFILE.resource,
                  {
                    headers: {
                      authorization: `DPoP ${accessToken}`,
                      dpop: await createDpopProof({
                        accessToken,
                        htm: "POST",
                        htu: DEMO_OAUTH_PROFILE.resource,
                      }),
                    },
                    method: "POST",
                  },
                );
                if (!response.ok)
                  throw new Error("Bound resource call failed.");
                return (await response.json()) as {
                  readonly reference: string;
                  readonly status: "submitted";
                };
              },
              fetch: authorizationServer.fetch,
              grant,
              profile: DEMO_OAUTH_PROFILE,
              request,
            });
            return submitted;
          },
        },
      });
      const sender = createAgentExchangeSender({
        agency: createAgency({
          policy: approvalPolicy(),
          store: createMemoryAgencyStore(),
        }),
        allowHighRisk: () => true,
        allowInsecureLocalhost: true,
        approvalProvider: approvalFor(activeSession),
        e2ee: envelope,
        keyDirectory: {
          resolve: () => ({
            keyId: keyHandle,
            publicKey: recipientKeys.publicKey,
          }),
        },
        source: {
          read: async (request) => {
            const begun = await oauthClient.begin(request);
            const callback = authorizationServer.authorize(begun.url);
            const grant = await oauthClient.complete(callback);
            return { bytes: encodeOAuthGrant(grant) };
          },
        },
        store: createMemoryAgentExchangeStore(),
        transport: { deliver: (delivery) => receiver.receive(delivery) },
      });
      const requested = await sender.request({
        assurance: {
          approval: "webauthn-verifier-bound",
          credential: "sender-constrained",
          execution: "purpose-bound",
        },
        expiresAt: Date.now() + EXCHANGE_TTL_MS,
        idempotencyKey: crypto.randomUUID(),
        processingMode: "tool-confined",
        purpose: "Submit one email verification challenge",
        recipient: {
          agentId: "recipient-agent",
          authority: "https://recipient.example",
          deviceId: "recipient-tool",
          subject: USER_ID,
        },
        requester: {
          agentId: "requester-agent",
          authority: activeSession.origin,
          delegationId: "passkey-approved-demo",
          deviceId: "requester-browser",
          subject: USER_ID,
        },
        resource: {
          accountRef: "mailbox:demo-owner",
          challengeId: `challenge_${crypto.randomUUID()}`,
          operation: "verification.submit",
          origin: new URL(DEMO_OAUTH_PROFILE.resource).origin,
          provider: "standards-complete-demo",
        },
        risk: "authentication",
        secretKind: "oauth-authorization-grant",
      });
      const approval = await sender.beginApproval(
        requested.exchange.exchangeId,
      );
      flows.set(requested.exchange.exchangeId, { authorizationServer, sender });
      return Object.freeze({
        exchangeId: requested.exchange.exchangeId,
        options: approval.options,
      });
    },

    beginRegistration: async (input: {
      readonly origin: string;
      readonly sessionToken: string;
    }) => {
      const activeSession = session(input.sessionToken, input.origin);
      const credentials = await credentialStore.listCredentialsByUser(USER_ID);
      const generated = await adapter.createRegistrationOptions({
        excludeCredentials: credentials.map(({ credentialId }) => ({
          id: credentialId,
        })),
        rpId: activeSession.rpId,
        rpName: "AbsoluteJS Agent Exchange Demo",
        userDisplayName: "Demo Owner",
        userId: USER_ID,
        userName: "demo-owner",
      });
      activeSession.registrationChallenge = generated.challenge;
      return generated.options;
    },

    createSession: (origin: string) => {
      const validated = validDemoOrigin(origin);
      const token = `session_${crypto.randomUUID()}_${crypto.randomUUID()}`;
      sessions.set(token, {
        expiresAt: Date.now() + SESSION_TTL_MS,
        ...validated,
      });
      return Object.freeze({ sessionToken: token });
    },

    finishRegistration: async (input: {
      readonly origin: string;
      readonly response: unknown;
      readonly sessionToken: string;
    }) => {
      const activeSession = session(input.sessionToken, input.origin);
      const challenge = activeSession.registrationChallenge;
      activeSession.registrationChallenge = undefined;
      if (challenge === undefined)
        throw new Error("Registration was not started.");
      const result = await adapter.verifyRegistration({
        expectedChallenge: challenge,
        expectedOrigin: activeSession.origin,
        expectedRPID: activeSession.rpId,
        response: input.response,
      });
      if (!result.verified || result.credential === undefined)
        throw new Error("Passkey registration failed.");
      await credentialStore.saveCredential({
        ...result.credential,
        createdAt: Date.now(),
        userId: USER_ID,
      });
      return Object.freeze({ registered: true as const });
    },
  });
};
