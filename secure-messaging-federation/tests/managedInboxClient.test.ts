import { expect, test } from "bun:test";
import { createManagedFederationInboxClient } from "../src/managedInboxClient";

const ORIGIN = "https://paas.example";
const RESOURCE = `${ORIGIN}/api/agent/federation/inbox`;
const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const LEASE_ID = "22222222-2222-4222-8222-222222222222";
const LEASE_TOKEN = "A".repeat(43);

const proofPayload = (request: Request) => {
  const proof = request.headers.get("dpop");
  if (!proof) throw new Error("DPoP proof is missing");
  const [, payload] = proof.split(".");
  if (!payload) throw new Error("DPoP payload is missing");
  const value: unknown = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  );
  if (typeof value !== "object" || value === null)
    throw new Error("DPoP payload is invalid");

  return value;
};

const field = (value: object, name: string) => Reflect.get(value, name);

test("authorizes and consumes the managed inbox with separate DPoP nonces", async () => {
  let tokenRequests = 0;
  let leaseRequests = 0;
  let verificationCode = "";
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (
      url.pathname ===
      "/.well-known/oauth-protected-resource/api/agent/federation/inbox"
    )
      return Response.json({
        authorization_servers: [ORIGIN],
        dpop_bound_access_tokens_required: true,
        resource: RESOURCE,
      });
    if (url.pathname === "/.well-known/oauth-authorization-server")
      return Response.json({
        device_authorization_endpoint: `${ORIGIN}/oauth2/device_authorization`,
        issuer: ORIGIN,
        registration_endpoint: `${ORIGIN}/oauth2/register`,
        token_endpoint: `${ORIGIN}/oauth2/token`,
      });
    if (url.pathname === "/oauth2/register")
      return Response.json({ client_id: "agent-client-1" });
    if (url.pathname === "/oauth2/device_authorization") {
      const body = new URLSearchParams(await request.text());
      expect(body.get("resource")).toBe(RESOURCE);

      return Response.json({
        device_code: "device-secret",
        expires_in: 600,
        interval: 1,
        user_code: "ABCD-EFGH",
        verification_uri: `${ORIGIN}/oauth2/device`,
        verification_uri_complete: `${ORIGIN}/oauth2/device?user_code=ABCD-EFGH`,
      });
    }
    if (url.pathname === "/oauth2/token") {
      tokenRequests += 1;
      const payload = proofPayload(request);
      expect(field(payload, "htu")).toBe(`${ORIGIN}/oauth2/token`);
      if (tokenRequests === 1) {
        expect(field(payload, "nonce")).toBeUndefined();

        return Response.json(
          { error: "use_dpop_nonce" },
          { headers: { "DPoP-Nonce": "authorization-nonce" }, status: 400 },
        );
      }
      expect(field(payload, "nonce")).toBe("authorization-nonce");
      if (tokenRequests === 2)
        return Response.json(
          { error: "authorization_pending" },
          { status: 400 },
        );

      return Response.json({
        access_token: "sender-constrained-token",
        token_type: "DPoP",
      });
    }
    if (url.pathname.endsWith("/leases")) {
      leaseRequests += 1;
      const payload = proofPayload(request);
      expect(request.headers.get("authorization")).toBe(
        "DPoP sender-constrained-token",
      );
      if (leaseRequests === 1) {
        expect(field(payload, "nonce")).toBeUndefined();

        return Response.json(
          { error: "use_dpop_nonce" },
          { headers: { "DPoP-Nonce": "resource-nonce" }, status: 401 },
        );
      }
      expect(field(payload, "nonce")).toBe("resource-nonce");

      return Response.json({
        cursor: "1",
        leaseExpiresAt: "2026-08-27T12:01:00.000Z",
        leaseId: LEASE_ID,
        leaseToken: LEASE_TOKEN,
        messages: [
          {
            attempts: 1,
            expiresAt: "2026-08-27T12:05:00.000Z",
            message: "opaque-signed-ciphertext",
            messageId: "message-1",
            originDomain: "sender.example",
            receivedAt: "2026-08-27T12:00:00.000Z",
            sequence: "1",
            sessionId: "session-1",
          },
        ],
      });
    }
    if (url.pathname.endsWith("/acknowledge")) {
      const payload = proofPayload(request);
      expect(field(payload, "nonce")).toBe("resource-nonce");
      expect(request.headers.get("authorization")).toBe(
        "DPoP sender-constrained-token",
      );

      return Response.json({ acknowledged: 1 });
    }

    return new Response("not found", { status: 404 });
  };
  const client = await createManagedFederationInboxClient({
    baseUrl: ORIGIN,
    domain: "mail.example",
    fetch,
    projectId: PROJECT_ID,
    sleep: async () => undefined,
    onVerification: ({ userCode }) => {
      verificationCode = userCode;
    },
  });

  await client.authorize();
  const lease = await client.lease();
  expect(verificationCode).toBe("ABCD-EFGH");
  expect(lease.messages[0]?.message).toBe("opaque-signed-ciphertext");
  expect(await client.acknowledge(lease)).toBe(1);
  expect(tokenRequests).toBe(3);
  expect(leaseRequests).toBe(2);
});

test("rejects protected-resource metadata for another resource", async () => {
  const fetch = async () =>
    Response.json({
      authorization_servers: [ORIGIN],
      dpop_bound_access_tokens_required: true,
      resource: "https://attacker.example/inbox",
    });

  await expect(
    createManagedFederationInboxClient({
      baseUrl: ORIGIN,
      domain: "mail.example",
      fetch,
      onVerification: () => undefined,
      projectId: PROJECT_ID,
    }),
  ).rejects.toThrow("Protected-resource metadata identifies another resource");
});

test("rejects an insecure PaaS URL before discovery", async () => {
  let requests = 0;

  await expect(
    createManagedFederationInboxClient({
      baseUrl: "http://paas.example",
      domain: "mail.example",
      fetch: async () => {
        requests += 1;
        return Response.json({});
      },
      onVerification: () => undefined,
      projectId: PROJECT_ID,
    }),
  ).rejects.toThrow("PaaS URL must use HTTPS");
  expect(requests).toBe(0);
});
