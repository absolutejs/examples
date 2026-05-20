import type { LinkedProviderBinding } from "@absolutejs/linked-providers";
import {
  createNeonLinkedProviderStores,
  createNeonOAuthLinkedProviderCredentialResolver,
  createProvidersConfiguration,
} from "@absolutejs/auth";

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GOOGLE_CONTACTS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/contacts.readonly";

export type LinkedGoogleContactsSelection = {
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

const getLinkedGoogleContactsDatabaseUrl = () =>
  getEnv("RAG_GOOGLE_CONTACTS_LINKED_DATABASE_URL") ??
  getEnv("AUTH_DATABASE_URL") ??
  getEnv("DATABASE_URL");

const summarizeScopes = (scopes: string[]) =>
  scopes.length > 0 ? scopes.join(", ") : "none granted";

const resolveSelectionMode = (selection: LinkedGoogleContactsSelection) => {
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

export const createLinkedGoogleContactsCredentialResolverFromEnv = async () => {
  const databaseUrl = getLinkedGoogleContactsDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Missing RAG_GOOGLE_CONTACTS_LINKED_DATABASE_URL, AUTH_DATABASE_URL, or DATABASE_URL for linked Google Contacts sync",
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

export const loadLinkedGoogleContactsStatus = async (
  selection: LinkedGoogleContactsSelection,
) => {
  const databaseUrl = getLinkedGoogleContactsDatabaseUrl();

  if (!databaseUrl) {
    return {
      linkedConnectorProvider: "google_contacts",
      linkedProviderConfigured: false,
      linkedProviderError:
        "Missing RAG_GOOGLE_CONTACTS_LINKED_DATABASE_URL, AUTH_DATABASE_URL, or DATABASE_URL",
      linkedProviderSelectionMode: resolveSelectionMode(selection),
    };
  }

  if (!selection.bindingId && !selection.ownerRef) {
    return {
      linkedConnectorProvider: "google_contacts",
      linkedProviderConfigured: false,
      linkedProviderError:
        "An authenticated user is required to resolve linked Google Contacts bindings",
      linkedProviderSelectionMode: resolveSelectionMode(selection),
    };
  }

  const { bindingStore, grantStore } =
    createNeonLinkedProviderStores(databaseUrl);

  let binding: LinkedProviderBinding | undefined;
  let contactsBindings: LinkedProviderBinding[] = [];

  if (selection.ownerRef) {
    contactsBindings = (
      await bindingStore.listBindingsByOwner(selection.ownerRef)
    ).filter(
      (candidate: LinkedProviderBinding) =>
        candidate.connectorProvider === "google_contacts",
    );
  }

  if (selection.bindingId) {
    const candidate = await bindingStore.getBinding(selection.bindingId);
    if (candidate?.connectorProvider === "google_contacts") {
      binding = candidate;
    }
  }

  if (!binding && selection.ownerRef) {
    binding = selection.externalAccountId
      ? contactsBindings.find(
          (candidate: LinkedProviderBinding) =>
            candidate.externalAccountId === selection.externalAccountId,
        )
      : contactsBindings[0];
  }

  const grant = binding
    ? await grantStore.getGrant(binding.grantId)
    : undefined;
  const grantedScopes = grant?.grantedScopes ?? binding?.availableScopes ?? [];

  return {
    linkedAccountLabel:
      binding?.label ?? binding?.email ?? binding?.externalAccountId,
    linkedAvailableBindingCount: contactsBindings.length,
    linkedAvailableBindings: contactsBindings.map(
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
    linkedConnectorProvider: "google_contacts",
    linkedEmail: binding?.email,
    linkedExternalAccountId:
      binding?.externalAccountId ?? selection.externalAccountId,
    linkedGrantExpiresAt: grant?.expiresAt,
    linkedGrantLastRefreshError: grant?.lastRefreshError,
    linkedGrantStatus: grant?.status ?? "missing",
    linkedOwnerRef: grant?.ownerRef ?? selection.ownerRef,
    linkedProviderConfigured: true,
    linkedProviderFound: Boolean(binding && grant),
    linkedProviderScopeSummary: summarizeScopes(grantedScopes),
    linkedProviderSelectionMode: resolveSelectionMode(selection),
    linkedProviderSubject: grant?.providerSubject,
    linkedRequestedBindingId: selection.bindingId,
    linkedRequestedExternalAccountId: selection.externalAccountId,
    linkedScopes: grantedScopes,
  };
};
