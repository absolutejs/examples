import { describe, expect, test } from "bun:test";
import type { AgentExchangeRequest } from "@absolutejs/agent-exchange";
import {
  createHardenedOAuthAuthorizationClient,
  redeemOAuthGrant,
} from "@absolutejs/agent-exchange-oauth";
import { createMemoryOAuthAuthorizationSessionStore } from "@absolutejs/agent-exchange-oauth-stores";
import { createWebCryptoDpopProofSigner } from "@absolutejs/agent-exchange-oauth-webcrypto";
import {
  createMockAuthorizationServer,
  DEMO_OAUTH_PROFILE,
} from "../src/backend/security/mockAuthorizationServer";

const request = (): AgentExchangeRequest => ({
  actionId: "act_demo",
  assurance: {
    approval: "webauthn-verifier-bound",
    credential: "sender-constrained",
    execution: "purpose-bound",
  },
  createdAt: Date.now(),
  exchangeId: "xchg_demo",
  expiresAt: Date.now() + 60_000,
  maximumUses: 1,
  nonce: "request-nonce",
  processingMode: "tool-confined",
  purpose: "Submit one verification challenge",
  recipient: {
    agentId: "recipient-agent",
    authority: "https://recipient.example",
    subject: "demo-owner",
  },
  requester: {
    agentId: "requester-agent",
    authority: "https://requester.example",
    subject: "demo-owner",
  },
  resource: {
    accountRef: "mailbox:demo-owner",
    operation: "verification.submit",
    origin: "https://api.example",
    provider: "standards-complete-demo",
  },
  risk: "authentication",
  secretKind: "oauth-authorization-grant",
});

describe("standards-complete demo authorization server", () => {
  test("requires PAR, S256 PKCE, a DPoP nonce, ath, and the same key", async () => {
    const server = createMockAuthorizationServer();
    const client = createHardenedOAuthAuthorizationClient({
      fetch: server.fetch,
      profile: DEMO_OAUTH_PROFILE,
      sessionStore: createMemoryOAuthAuthorizationSessionStore(),
    });
    const exchangeRequest = request();
    const begun = await client.begin(exchangeRequest);
    expect(begun.url).not.toContain("code_challenge");
    const grant = await client.complete(server.authorize(begun.url));
    expect(() => server.assertPublicValue(grant)).toThrow("secret crossed");

    const dpop = await createWebCryptoDpopProofSigner();
    const result = await redeemOAuthGrant({
      dpop,
      execute: async ({ accessToken, createDpopProof }) => {
        const response = await server.fetch(DEMO_OAUTH_PROFILE.resource, {
          headers: {
            authorization: `DPoP ${accessToken}`,
            dpop: await createDpopProof({
              accessToken,
              htm: "POST",
              htu: DEMO_OAUTH_PROFILE.resource,
            }),
          },
          method: "POST",
        });
        expect(response.status).toBe(200);
        return response.json();
      },
      fetch: server.fetch,
      grant,
      profile: DEMO_OAUTH_PROFILE,
      request: exchangeRequest,
    });

    server.assertPublicValue(result);
    expect(server.protocolEvidence()).toEqual({
      accessTokenSenderConstrained: true,
      authorizationDetailsBound: true,
      nonceRetryObserved: true,
      parUsed: true,
      pkceS256Verified: true,
      resourceIndicatorBound: true,
    });
  });
});
