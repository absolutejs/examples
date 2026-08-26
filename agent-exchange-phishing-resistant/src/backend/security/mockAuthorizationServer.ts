import { verifyDpopProof } from "@absolutejs/agent-exchange-provider-conformance";
import type { HardenedOAuthProfile } from "@absolutejs/agent-exchange-oauth";

const encoder = new TextEncoder();

export const DEMO_OAUTH_PROFILE: HardenedOAuthProfile = Object.freeze({
  authorizationDetails: {
    actions: ["submit"],
    identifier: "email-verification-code",
    locations: ["https://api.example/verification"],
    type: "absolute_agent_action",
  },
  authorizationEndpoint: "https://issuer.example/authorize",
  clientId: "absolutejs-agent-demo",
  issuer: "https://issuer.example",
  pushedAuthorizationRequestEndpoint: "https://issuer.example/par",
  redirectUri: "https://requester.example/oauth/callback",
  resource: "https://api.example/verification",
  scopes: ["verification.submit"],
  tokenEndpoint: "https://issuer.example/token",
});

type PendingRequest = {
  readonly body: URLSearchParams;
  readonly expiresAt: number;
};

type AuthorizationCode = {
  readonly challenge: string;
  readonly expiresAt: number;
  readonly resource: string;
};

type BoundToken = {
  readonly expiresAt: number;
  readonly publicJwk: JsonWebKey;
  used: boolean;
};

export type MockAuthorizationServer = {
  readonly assertPublicValue: (value: unknown) => void;
  readonly authorize: (authorizationUrl: string) => {
    readonly code: string;
    readonly iss: string;
    readonly state: string;
  };
  readonly fetch: (input: string, init: RequestInit) => Promise<Response>;
  readonly protocolEvidence: () => {
    readonly accessTokenSenderConstrained: true;
    readonly authorizationDetailsBound: true;
    readonly nonceRetryObserved: boolean;
    readonly parUsed: true;
    readonly pkceS256Verified: boolean;
    readonly resourceIndicatorBound: true;
  };
};

const randomValue = (prefix: string): string =>
  `${prefix}_${crypto.randomUUID()}`;

const sha256Base64Url = async (value: string): Promise<string> => {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
  return Buffer.from(digest).toString("base64url");
};

const samePublicKey = (left: JsonWebKey, right: JsonWebKey): boolean =>
  left.kty === right.kty &&
  left.crv === right.crv &&
  left.x === right.x &&
  left.y === right.y;

export const createMockAuthorizationServer = (
  now: () => number = Date.now,
): MockAuthorizationServer => {
  const requests = new Map<string, PendingRequest>();
  const codes = new Map<string, AuthorizationCode>();
  const tokens = new Map<string, BoundToken>();
  const seenProofs = new Set<string>();
  const secretValues = new Set<string>();
  const tokenNonce = randomValue("nonce");
  let nonceRetryObserved = false;
  let pkceS256Verified = false;

  const verifyFreshProof = async (
    input: Parameters<typeof verifyDpopProof>[0],
  ) => {
    if (seenProofs.has(input.proof)) throw new Error("DPoP proof replayed");
    const key = await verifyDpopProof(input);
    seenProofs.add(input.proof);
    return key;
  };

  const fetch = async (input: string, init: RequestInit): Promise<Response> => {
    if (input === DEMO_OAUTH_PROFILE.pushedAuthorizationRequestEndpoint) {
      const body = new URLSearchParams(String(init.body));
      const details = body.get("authorization_details");
      if (
        init.method !== "POST" ||
        body.get("client_id") !== DEMO_OAUTH_PROFILE.clientId ||
        body.get("code_challenge_method") !== "S256" ||
        body.get("resource") !== DEMO_OAUTH_PROFILE.resource ||
        details !== JSON.stringify(DEMO_OAUTH_PROFILE.authorizationDetails)
      ) {
        return Response.json({ error: "invalid_request" }, { status: 400 });
      }
      const handle = randomValue("request");
      requests.set(handle, { body, expiresAt: now() + 90_000 });
      return Response.json(
        { expires_in: 90, request_uri: `urn:absolutejs:par:${handle}` },
        { status: 201 },
      );
    }

    if (input === DEMO_OAUTH_PROFILE.tokenEndpoint) {
      const proof = new Headers(init.headers).get("dpop") ?? "";
      const body = new URLSearchParams(String(init.body));
      const codeValue = body.get("code") ?? "";
      const code = codes.get(codeValue);
      if (code === undefined || code.expiresAt <= now())
        return Response.json({ error: "invalid_grant" }, { status: 400 });
      let publicJwk: JsonWebKey;
      try {
        try {
          publicJwk = await verifyFreshProof({
            htm: "POST",
            htu: DEMO_OAUTH_PROFILE.tokenEndpoint,
            now,
            proof,
          });
        } catch {
          publicJwk = await verifyFreshProof({
            htm: "POST",
            htu: DEMO_OAUTH_PROFILE.tokenEndpoint,
            nonce: tokenNonce,
            now,
            proof,
          });
        }
      } catch {
        return Response.json({ error: "invalid_dpop_proof" }, { status: 400 });
      }
      const payloadPart = proof.split(".")[1] ?? "";
      const payload = JSON.parse(
        Buffer.from(payloadPart, "base64url").toString(),
      ) as { readonly nonce?: string };
      if (payload.nonce !== tokenNonce) {
        nonceRetryObserved = true;
        return Response.json(
          { error: "use_dpop_nonce" },
          { headers: { "dpop-nonce": tokenNonce }, status: 400 },
        );
      }
      if (
        body.get("client_id") !== DEMO_OAUTH_PROFILE.clientId ||
        body.get("redirect_uri") !== DEMO_OAUTH_PROFILE.redirectUri ||
        body.get("resource") !== code.resource ||
        (await sha256Base64Url(body.get("code_verifier") ?? "")) !==
          code.challenge
      ) {
        return Response.json({ error: "invalid_grant" }, { status: 400 });
      }
      codes.delete(codeValue);
      pkceS256Verified = true;
      const accessToken = randomValue("token");
      secretValues.add(accessToken);
      tokens.set(accessToken, {
        expiresAt: now() + 60_000,
        publicJwk,
        used: false,
      });
      return Response.json({
        access_token: accessToken,
        expires_in: 60,
        token_type: "DPoP",
      });
    }

    if (input === DEMO_OAUTH_PROFILE.resource) {
      const headers = new Headers(init.headers);
      const authorization = headers.get("authorization") ?? "";
      const [scheme, accessToken] = authorization.split(" ");
      const token =
        accessToken === undefined ? undefined : tokens.get(accessToken);
      if (
        init.method !== "POST" ||
        scheme !== "DPoP" ||
        accessToken === undefined ||
        token === undefined ||
        token.used ||
        token.expiresAt <= now()
      ) {
        return Response.json({ error: "invalid_token" }, { status: 401 });
      }
      try {
        const key = await verifyFreshProof({
          accessToken,
          htm: "POST",
          htu: DEMO_OAUTH_PROFILE.resource,
          now,
          proof: headers.get("dpop") ?? "",
        });
        if (!samePublicKey(key, token.publicJwk)) throw new Error("wrong key");
      } catch {
        return Response.json({ error: "invalid_dpop_proof" }, { status: 401 });
      }
      token.used = true;
      return Response.json({
        reference: randomValue("submission"),
        status: "submitted",
      });
    }

    return Response.json({ error: "not_found" }, { status: 404 });
  };

  return Object.freeze<MockAuthorizationServer>({
    assertPublicValue: (value: unknown) => {
      const serialized = JSON.stringify(value);
      if ([...secretValues].some((secret) => serialized.includes(secret)))
        throw new Error("secret crossed the agent-visible boundary");
    },
    authorize: (authorizationUrl: string) => {
      const url = new URL(authorizationUrl);
      if (
        url.origin + url.pathname !==
        DEMO_OAUTH_PROFILE.authorizationEndpoint
      )
        throw new Error("unexpected authorization endpoint");
      const requestUri = url.searchParams.get("request_uri") ?? "";
      const prefix = "urn:absolutejs:par:";
      const pending = requestUri.startsWith(prefix)
        ? requests.get(requestUri.slice(prefix.length))
        : undefined;
      if (pending === undefined || pending.expiresAt <= now())
        throw new Error("invalid pushed request");
      requests.delete(requestUri.slice(prefix.length));
      const code = randomValue("code");
      secretValues.add(code);
      codes.set(code, {
        challenge: pending.body.get("code_challenge") ?? "",
        expiresAt: now() + 60_000,
        resource: pending.body.get("resource") ?? "",
      });
      return {
        code,
        iss: DEMO_OAUTH_PROFILE.issuer,
        state: pending.body.get("state") ?? "",
      };
    },
    fetch,
    protocolEvidence: () => ({
      accessTokenSenderConstrained: true,
      authorizationDetailsBound: true,
      nonceRetryObserved,
      parUsed: true,
      pkceS256Verified,
      resourceIndicatorBound: true,
    }),
  });
};
