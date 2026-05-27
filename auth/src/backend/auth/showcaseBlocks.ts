// Optional auth blocks bolted onto the OAuth-only example so the showcase covers every
// stable surface @absolutejs/auth ships. Each block is independent — comment one out
// and only its routes disappear.

import {
  createInMemoryAuthorizationCodeStore,
  createInMemoryOidcRefreshTokenStore,
  createNeonAuditSink,
  createNeonCredentialStore,
  createNeonMfaStore,
  createNeonOAuthClientStore,
  createNeonPasswordlessTokenStore,
  createNeonWebAuthnCredentialStore,
  createTamperEvidentSink,
  generateSigningKey,
  type CredentialEmailMessage,
  type CredentialIdentity,
  type CredentialsConfig,
  type MagicLinkMessage,
  type MfaConfig,
  type OidcProviderConfig,
  type PasswordlessConfig,
  type PasswordlessOtpMessage,
  type SigningKey,
  type WebAuthnConfig,
} from "@absolutejs/auth";
import { eq } from "drizzle-orm";
import { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { schema, SchemaType, type User } from "../../../db/schema";
import {
  createCredentialUser,
  ensureEmailDeliverable,
  getCredentialUserByEmail,
} from "../handlers/credentialsHandlers";

// AUDIT_INTEGRITY_SECRET is optional — the tamper-evident sink falls back to
// keyless SHA-256 chaining without it. Set it in production for HMAC integrity.
const {AUDIT_INTEGRITY_SECRET} = process.env;

// In-memory storage for the OIDC signing key so each `bun dev` boot has a stable
// JWKS. In production load `OIDC_SIGNING_KEY_JWK` from your secret manager and
// only rotate via a planned migration — every issued token verifies against this.
const oidcSigningKeyCache: { key: SigningKey | undefined } = { key: undefined };
const loadOidcSigningKey = async () => {
  if (oidcSigningKeyCache.key !== undefined) return oidcSigningKeyCache.key;
  const cached = process.env.OIDC_SIGNING_KEY_JWK;
  if (typeof cached === "string" && cached.length > 0) {
    const parsed: SigningKey = JSON.parse(cached);
    oidcSigningKeyCache.key = parsed;

    return parsed;
  }
  const fresh = await generateSigningKey();
  oidcSigningKeyCache.key = fresh;
  console.warn(
    "[showcase] OIDC_SIGNING_KEY_JWK not set; generated ephemeral signing key (kid=%s). Tokens will become invalid on next boot.",
    fresh.kid,
  );

  return fresh;
};

// MFA secrets are AES-GCM encrypted at rest using this key. Generate a real one
// for production: `openssl rand -hex 32` → MFA_ENCRYPTION_KEY env var.
const loadMfaEncryptionKey = () => {
  const key = process.env.MFA_ENCRYPTION_KEY;
  if (typeof key === "string" && key.length > 0) return key;
  const fresh = crypto.randomUUID();
  console.warn(
    "[showcase] MFA_ENCRYPTION_KEY not set; using ephemeral key %s — TOTP enrollments will not survive a reboot",
    fresh,
  );

  return fresh;
};

// The webauthn adapter wraps @simplewebauthn/server. Lifted from intent's
// production wiring — see ~/intent/src/backend/utils/webauthnAdapter.ts.
const buildWebAuthnAdapter = async (): Promise<
  WebAuthnConfig<User>["webauthnAdapter"]
> => {
  const {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
  } = await import("@simplewebauthn/server");
  const { isoBase64URL } = await import("@simplewebauthn/server/helpers");

  return {
    createAuthenticationOptions: async ({ allowCredentials, rpId }) => {
      const options = await generateAuthenticationOptions({
         
        allowCredentials: allowCredentials.map((cred) => ({
          id: cred.id,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- @simplewebauthn types transport as a string-literal union; the adapter contract widens to string[]
          transports: cred.transports as never,
        })),
        rpID: rpId,
        userVerification: "preferred",
      });

      return {
        challenge: options.challenge,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- @simplewebauthn options shape -> Record<string, unknown> the package serializes verbatim
        options: options as unknown as Record<string, unknown>,
      };
    },
    createRegistrationOptions: async ({
      excludeCredentials,
      rpId,
      rpName,
      userDisplayName,
      userId,
      userName,
    }) => {
      const options = await generateRegistrationOptions({
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
         
        excludeCredentials: excludeCredentials.map((cred) => ({
          id: cred.id,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- same transport widening as above
          transports: cred.transports as never,
        })),
        rpID: rpId,
        rpName,
        userDisplayName,
        userID: new TextEncoder().encode(userId),
        userName,
      });

      return {
        challenge: options.challenge,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- @simplewebauthn options shape -> Record<string, unknown>
        options: options as unknown as Record<string, unknown>,
      };
    },
    verifyAuthentication: async ({
      credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      response,
    }) => {
      const result = await verifyAuthenticationResponse({
        credential: {
          counter: credential.counter,
          id: credential.credentialId,
          publicKey: isoBase64URL.toBuffer(credential.publicKey),
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- transport widening
          transports: credential.transports as never,
        },
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
        requireUserVerification: false,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- adapter contract passes browser JSON through as unknown
        response: response as never,
      });

      return {
        newCounter: result.authenticationInfo.newCounter,
        verified: result.verified,
      };
    },
    verifyRegistration: async ({
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      response,
    }) => {
      const result = await verifyRegistrationResponse({
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
        requireUserVerification: false,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- adapter contract passes browser JSON through as unknown
        response: response as never,
      });

      if (!result.verified || !result.registrationInfo) {
        return { verified: false };
      }

      const { credential, credentialBackedUp, credentialDeviceType } =
        result.registrationInfo;

      return {
        credential: {
          backedUp: credentialBackedUp,
          counter: credential.counter,
          credentialId: credential.id,
          deviceType: credentialDeviceType,
          publicKey: isoBase64URL.fromBuffer(credential.publicKey),
          transports: credential.transports,
        },
        verified: true,
      };
    },
  };
};

// Every "send X email/sms" hook logs to stdout so the showcase works without a real
// mailer. Production wires Brevo / SES / Twilio here — same hook signature, different
// transport. See intent/src/backend/utils/brevoEmail.ts for a real example.
const logCredentialEmail = (message: CredentialEmailMessage) => {
  console.log(
    `\n[showcase email] ${message.type} → ${message.email}\n  token: ${message.token}\n  expires: ${new Date(message.expiresAt).toISOString()}\n`,
  );
};

const logMagicLink = (message: MagicLinkMessage) => {
  console.log(
    `\n[showcase passwordless] magic-link to ${message.email}\n  token: ${message.token}\n  expires: ${new Date(message.expiresAt).toISOString()}\n`,
  );
};

const logPasswordlessOtp = (message: PasswordlessOtpMessage) => {
  console.log(
    `\n[showcase passwordless] OTP to ${message.email}\n  code: ${message.code}\n  expires: ${new Date(message.expiresAt).toISOString()}\n`,
  );
};

export type ShowcaseBlocksDeps = {
  databaseUrl: string;
  db: NeonHttpDatabase<SchemaType>;
  origin: string;
  rpId: string;
};

export const buildShowcaseBlocks = async ({
  databaseUrl,
  db,
  origin,
  rpId,
}: ShowcaseBlocksDeps) => {
  const auditStore = createNeonAuditSink(databaseUrl);
  const tamperEvidentAudit = createTamperEvidentSink({
    secret: AUDIT_INTEGRITY_SECRET,
    sink: auditStore,
    writerId: process.env.AUDIT_WRITER_ID ?? "showcase",
  });

  const oidcSigningKey = await loadOidcSigningKey();
  const webauthnAdapter = await buildWebAuthnAdapter();

  const credentials: CredentialsConfig<User> = {
    checkBreachesOnLogin: true,
    credentialStore: createNeonCredentialStore(databaseUrl),
    onSendEmail: logCredentialEmail,
    passwordPolicy: {
      checkBreaches: true,
      minLength: 12,
      requireDigit: true,
      requireLowercase: true,
      requireUppercase: true,
    },
    getUserByEmail: async (email) => {
      const user = await getCredentialUserByEmail(db, email);

      return user ?? null;
    },
    onCreateCredentialUser: async (
      identity: CredentialIdentity & Record<string, unknown>,
    ) => {
      const disposable = await ensureEmailDeliverable(identity.email);
      if (disposable !== null) {
        return new Response(JSON.stringify({ reason: disposable }), {
          headers: { "content-type": "application/json" },
          status: 400,
        });
      }

      return createCredentialUser(db, identity);
    },
  };

  const getUserBySub = async (userSub: string) => {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.sub, userSub))
      .limit(1);

    return user ?? null;
  };

  const mfa: MfaConfig<User> = {
    encryptionKey: loadMfaEncryptionKey(),
    mfaStore: createNeonMfaStore(databaseUrl),
    // The parked session passes the userIdentity blob (post-password, pre-MFA promotion);
    // its `sub` is whatever we stamped at session creation (credentials/MFA stores keyed by
    // the user's canonical sub).
    getChallengeUser: async (userIdentity) => {
      const sub =
        typeof userIdentity.sub === "string" ? userIdentity.sub : null;

      return sub === null ? null : getUserBySub(sub);
    },
    getUserId: (user) => user.sub,
  };

  const passwordless: PasswordlessConfig<User> = {
    onSendMagicLink: logMagicLink,
    onSendOtp: logPasswordlessOtp,
    passwordlessTokenStore: createNeonPasswordlessTokenStore(databaseUrl),
    getUserByEmail: async (email) => {
      const user = await getCredentialUserByEmail(db, email);

      return user ?? null;
    },
  };

  const webauthn: WebAuthnConfig<User> = {
    credentialStore: createNeonWebAuthnCredentialStore(databaseUrl),
    getWebAuthnUser: getUserBySub,
    origin,
    rpId,
    rpName: "AbsoluteJS Auth Example",
    webauthnAdapter,
    getUserId: (user) => user.sub,
  };

  const oidc: OidcProviderConfig<User> = {
    authorizationCodeStore: createInMemoryAuthorizationCodeStore(),
    clientStore: createNeonOAuthClientStore(databaseUrl),
    issuer: origin,
    refreshTokenStore: createInMemoryOidcRefreshTokenStore(),
    signingKey: oidcSigningKey,
    getClaims: (user) => ({
      email: user.email,
      family_name: user.last_name,
      given_name: user.first_name,
    }),
    getUserId: (user) => user.sub,
  };

  return {
    // Tamper-evident audit log: every emitted event is hash-chained, verifiable
    // via `verifyAuditChain`. Demonstrated on the React /audit page.
    audit: { auditStore: tamperEvidentAudit },
    credentials,
    mfa,
    // OAuth2 / OIDC provider — your app becomes an IdP. Discovery lives at
    // /.well-known/openid-configuration, JWKS at /oauth2/jwks.
    oidc,
    passwordless,
    // Self-service session management: GET /auth/sessions + DELETE /auth/sessions/:id
    // so a user can see + revoke their own devices.
    sessions: { getUserId: (user: User) => user.sub },
    webauthn,
  };
};
