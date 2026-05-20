import type { LinkedProviderBinding } from "@absolutejs/linked-providers";
import {
  createNeonLinkedProviderStores,
  createNeonOAuthLinkedProviderCredentialResolver,
  createProvidersConfiguration,
} from "@absolutejs/auth";

export const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";
const GOOGLE_CONTACTS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/contacts.readonly";

export type LinkedGmailSelection = {
  bindingId?: string;
  externalAccountId?: string;
  ownerRef?: string;
};

const getEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
};

const getRequiredEnv = (name: string) => {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }

  return value;
};

const getLinkedGmailDatabaseUrl = () =>
  getEnv("RAG_GMAIL_LINKED_DATABASE_URL") ??
  getEnv("AUTH_DATABASE_URL") ??
  getEnv("DATABASE_URL");

const summarizeScopes = (scopes: string[]) =>
  scopes.length > 0 ? scopes.join(", ") : "none granted";

const resolveSelectionMode = (selection: LinkedGmailSelection) => {
  if (selection.bindingId) {
    return "bindingId";
  }

  if (selection.externalAccountId) {
    return selection.ownerRef
      ? "externalAccountId"
      : "externalAccountId-unscoped";
  }

  if (selection.ownerRef) {
    return "ownerRef-first-binding";
  }

  return "unconfigured";
};

export const createLinkedGmailCredentialResolverFromEnv = async () => {
  const databaseUrl = getLinkedGmailDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Missing RAG_GMAIL_LINKED_DATABASE_URL, AUTH_DATABASE_URL, or DATABASE_URL for linked Gmail sync",
    );
  }

  return createNeonOAuthLinkedProviderCredentialResolver({
    databaseUrl,
    providersConfiguration: createProvidersConfiguration({
      google: {
        connector: {
          credentials: {
            clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
            clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
            redirectUri: getRequiredEnv("OAUTH2_CALLBACK_URI"),
          },
          scope: [
            "profile",
            "openid",
            "email",
            GMAIL_READONLY_SCOPE,
            GOOGLE_CONTACTS_READONLY_SCOPE,
          ],
          searchParams: [
            ["access_type", "offline"],
            ["prompt", "consent"],
          ],
        },
      },
    }),
  });
};

export const loadLinkedGmailStatus = async (
  selection: LinkedGmailSelection,
) => {
  const databaseUrl = getLinkedGmailDatabaseUrl();

  if (!databaseUrl) {
    return {
      linkedProviderConfigured: false,
      linkedProviderError:
        "Missing RAG_GMAIL_LINKED_DATABASE_URL, AUTH_DATABASE_URL, or DATABASE_URL",
      linkedProviderSelectionMode: resolveSelectionMode(selection),
    };
  }

  if (!selection.bindingId && !selection.ownerRef) {
    return {
      linkedConnectorProvider: "gmail",
      linkedProviderConfigured: false,
      linkedProviderError:
        "An authenticated user is required to resolve linked Gmail bindings",
      linkedProviderSelectionMode: resolveSelectionMode(selection),
    };
  }

  const { bindingStore, grantStore } =
    createNeonLinkedProviderStores(databaseUrl);

  let binding: LinkedProviderBinding | undefined;
  let gmailBindings: LinkedProviderBinding[] = [];

  if (selection.ownerRef) {
    gmailBindings = (
      await bindingStore.listBindingsByOwner(selection.ownerRef)
    ).filter(
      (candidate: LinkedProviderBinding) =>
        candidate.connectorProvider === "gmail",
    );
  }

  if (selection.bindingId) {
    const candidate = await bindingStore.getBinding(selection.bindingId);
    if (candidate?.connectorProvider === "gmail") {
      binding = candidate;
    }
  }

  if (!binding && selection.ownerRef) {
    binding = selection.externalAccountId
      ? gmailBindings.find(
          (candidate: LinkedProviderBinding) =>
            candidate.externalAccountId === selection.externalAccountId,
        )
      : gmailBindings[0];
  }

  const grant = binding
    ? await grantStore.getGrant(binding.grantId)
    : undefined;
  const grantedScopes = grant?.grantedScopes ?? binding?.availableScopes ?? [];

  return {
    linkedAccountLabel:
      binding?.label ?? binding?.email ?? binding?.externalAccountId,
    linkedAvailableBindingCount: gmailBindings.length,
    linkedAvailableBindings: gmailBindings.map(
      (candidate: LinkedProviderBinding) => ({
        email: candidate.email,
        externalAccountId: candidate.externalAccountId,
        id: candidate.id,
        label:
          candidate.label ?? candidate.email ?? candidate.externalAccountId,
      }),
    ),
    linkedBindingId: binding?.id ?? selection.bindingId,
    linkedBindingLabel: binding?.label,
    linkedBindingStatus: binding?.status ?? "missing",
    linkedConnectorProvider: "gmail",
    linkedEmail: binding?.email,
    linkedExternalAccountId:
      binding?.externalAccountId ?? selection.externalAccountId,
    linkedGrantExpiresAt: grant?.expiresAt,
    linkedGrantLastRefreshError: grant?.lastRefreshError,
    linkedGrantStatus: grant?.status ?? "missing",
    linkedMailboxLabel:
      binding?.label ?? binding?.email ?? binding?.externalAccountId,
    linkedOwnerRef: grant?.ownerRef ?? selection.ownerRef,
    linkedProviderConfigured: true,
    linkedProviderFound: Boolean(binding && grant),
    linkedProviderScopeSummary: summarizeScopes(grantedScopes),
    linkedProviderSelectionMode: resolveSelectionMode(selection),
    linkedProviderSubject: grant?.providerSubject,
    linkedRequestedExternalAccountId: selection.externalAccountId,
    linkedRequestedBindingId: selection.bindingId,
    linkedScopes: grantedScopes,
  };
};
