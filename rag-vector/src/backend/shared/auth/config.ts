import { neon } from "@neondatabase/serverless";
import {
  absoluteAuth,
  createProvidersConfiguration,
  extractPropFromIdentity,
  instantiateUserSession,
  isValidProviderOption,
  providers,
  type AbsoluteAuthSessionStore,
} from "@absolutejs/auth";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type {
  OAuth2ConfigurationOptions,
  SessionRecord,
} from "@absolutejs/auth";
import { authSchema } from "./schema";

export type AuthUser = {
  sub: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  created_at?: Date | null;
  primary_auth_identity_id?: string | null;
};

const getRequiredEnv = (key: string) => {
  const value = process.env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing environment variable ${key}`);
  }

  return value;
};

const providersConfiguration: OAuth2ConfigurationOptions =
  createProvidersConfiguration({
    facebook: {
      connector: {
        credentials: {
          clientId: getRequiredEnv("FACEBOOK_CONNECTOR_CLIENT_ID"),
          clientSecret: getRequiredEnv("FACEBOOK_CONNECTOR_CLIENT_SECRET"),
          redirectUri: getRequiredEnv("OAUTH2_CALLBACK_URI"),
        },
        scope: ["pages_show_list", "pages_read_engagement", "instagram_basic"],
      },
      login: {
        credentials: {
          clientId: getRequiredEnv("FACEBOOK_CLIENT_ID"),
          clientSecret: getRequiredEnv("FACEBOOK_CLIENT_SECRET"),
          redirectUri: getRequiredEnv("OAUTH2_CALLBACK_URI"),
        },
        scope: ["email"],
      },
    },
    google: {
      connector: {
        credentials: {
          clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
          clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
          redirectUri: getRequiredEnv("OAUTH2_CALLBACK_URI"),
        },
        scope: [
          "profile",
          "email",
          "openid",
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/contacts.readonly",
        ],
        searchParams: [
          ["access_type", "offline"],
          ["prompt", "consent"],
        ],
      },
      login: {
        credentials: {
          clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
          clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
          redirectUri: getRequiredEnv("OAUTH2_CALLBACK_URI"),
        },
        scope: ["profile", "email", "openid"],
        searchParams: [
          ["access_type", "offline"],
          ["prompt", "consent"],
        ],
      },
    },
  });

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const buildProviderSubjectFromIdentity = ({
  authProvider,
  userIdentity,
}: {
  authProvider: string;
  userIdentity: Record<string, unknown>;
}) => {
  if (!isValidProviderOption(authProvider)) {
    throw new Error(`Invalid auth provider ${authProvider}`);
  }

  const providerConfiguration = providers[authProvider];
  return String(
    extractPropFromIdentity(
      userIdentity,
      providerConfiguration.subject,
      providerConfiguration.subjectType,
    ),
  );
};

const buildCanonicalUserFieldsFromIdentity = ({
  authProvider,
  userIdentity,
}: {
  authProvider: string;
  userIdentity: Record<string, unknown>;
}) => {
  if (!isValidProviderOption(authProvider)) {
    throw new Error(`Invalid auth provider ${authProvider}`);
  }

  const providerConfiguration = providers[authProvider];

  const readOptionalField = (keys?: string[]) => {
    if (!keys || keys.length === 0) {
      return undefined;
    }

    try {
      return normalizeOptionalString(
        extractPropFromIdentity(userIdentity, keys, "string"),
      );
    } catch {
      return undefined;
    }
  };

  const fullName = readOptionalField(providerConfiguration.fullName);
  const fullNameParts = fullName?.split(/\s+/).filter(Boolean) ?? [];
  const fallbackFirstName = fullNameParts[0];
  const fallbackLastName =
    fullNameParts.length > 1 ? fullNameParts.slice(1).join(" ") : undefined;

  return {
    email:
      readOptionalField(providerConfiguration.email)?.toLowerCase() ?? null,
    first_name:
      readOptionalField(providerConfiguration.givenName) ??
      fallbackFirstName ??
      null,
    last_name:
      readOptionalField(providerConfiguration.familyName) ??
      fallbackLastName ??
      null,
  };
};

const createIdentityId = (authProvider: string, providerSubject: string) =>
  `${authProvider}:${providerSubject}`;

const createUserWithIdentity = async ({
  authProvider,
  db,
  userIdentity,
}: {
  authProvider: string;
  db: ReturnType<typeof drizzle<typeof authSchema>>;
  userIdentity: Record<string, unknown>;
}) => {
  const sub = crypto.randomUUID();
  const providerSubject = buildProviderSubjectFromIdentity({
    authProvider,
    userIdentity,
  });
  const identityId = createIdentityId(authProvider, providerSubject);

  const [createdUser] = await db
    .insert(authSchema.users)
    .values({
      sub,
      primary_auth_identity_id: identityId,
      ...buildCanonicalUserFieldsFromIdentity({
        authProvider,
        userIdentity,
      }),
    })
    .returning();

  await db.insert(authSchema.authIdentities).values({
    auth_provider: authProvider,
    id: identityId,
    metadata: userIdentity,
    provider_subject: providerSubject,
    user_sub: sub,
  });

  return createdUser satisfies AuthUser;
};

const getUserByIdentity = async ({
  authProvider,
  db,
  userIdentity,
}: {
  authProvider: string;
  db: ReturnType<typeof drizzle<typeof authSchema>>;
  userIdentity: Record<string, unknown>;
}) => {
  const providerSubject = buildProviderSubjectFromIdentity({
    authProvider,
    userIdentity,
  });

  const [identity] = await db
    .select()
    .from(authSchema.authIdentities)
    .where(
      eq(
        authSchema.authIdentities.id,
        createIdentityId(authProvider, providerSubject),
      ),
    );

  if (!identity) {
    return undefined;
  }

  const [user] = await db
    .select()
    .from(authSchema.users)
    .where(eq(authSchema.users.sub, identity.user_sub));

  return user satisfies AuthUser | undefined;
};

export const buildRagAbsoluteAuth = ({
  authDatabaseUrl,
  authSessionStore,
}: {
  authDatabaseUrl: string;
  authSessionStore: AbsoluteAuthSessionStore<AuthUser>;
}) => {
  const sql = neon(authDatabaseUrl);
  const db = drizzle(sql, {
    schema: authSchema,
  });

  return absoluteAuth<AuthUser>({
    authSessionStore,
    onCallbackSuccess: async ({
      authProvider,
      cookie: { user_session_id },
      providerInstance,
      session,
      tokenResponse,
      unregisteredSession,
    }) =>
      instantiateUserSession<AuthUser>({
        authProvider,
        getUser: async (userIdentity) =>
          getUserByIdentity({
            authProvider,
            db,
            userIdentity,
          }),
        onNewUser: async (userIdentity) =>
          createUserWithIdentity({
            authProvider,
            db,
            userIdentity,
          }),
        providerInstance,
        session,
        tokenResponse,
        unregisteredSession,
        user_session_id,
      }),
    providersConfiguration,
    resolveAuthIntent: () => "login",
  });
};
