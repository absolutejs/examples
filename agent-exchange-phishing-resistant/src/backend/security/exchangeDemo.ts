import {
  createAgency,
  createMemoryAgencyStore,
  type PolicyDecisionPoint,
} from "@absolutejs/agency";
import {
  createAgentExchangeReceiver,
  createAgentExchangeSender,
  createMemoryAgentExchangeReplayStore,
  createMemoryAgentExchangeStore,
  type AgentExchangeReceipt,
  type AgentExchangeSender,
} from "@absolutejs/agent-exchange";
import {
  createHardenedOAuthAuthorizationClient,
  decodeOAuthGrant,
  encodeOAuthGrant,
  redeemOAuthGrant,
} from "@absolutejs/agent-exchange-oauth";
import { createMemoryOAuthAuthorizationSessionStore } from "@absolutejs/agent-exchange-oauth-stores";
import { createWebCryptoDpopProofSigner } from "@absolutejs/agent-exchange-oauth-webcrypto";
import { createWebAuthnAgentExchangeApprovalProvider } from "@absolutejs/agent-exchange-webauthn";
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
  const credentialStore: WebAuthnCredentialStore =
    createInMemoryWebAuthnCredentialStore();

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

  return Object.freeze({
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
        approvalProvider: createWebAuthnAgentExchangeApprovalProvider({
          adapter,
          allowInsecureLocalhost: true,
          credentialStore,
          origin: activeSession.origin,
          resolveUserId: () => USER_ID,
          rpId: activeSession.rpId,
        }),
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
