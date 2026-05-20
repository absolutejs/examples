import type { LinkedProviderBinding } from "@absolutejs/linked-providers";
import {
  createNeonLinkedProviderStores,
  createNeonOAuthLinkedProviderCredentialResolver,
  createProvidersConfiguration,
} from "@absolutejs/auth";

export const FACEBOOK_PAGE_READ_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
] as const;

export const INSTAGRAM_BUSINESS_READ_SCOPES = [
  "pages_show_list",
  "instagram_basic",
] as const;

type LinkedMetaProvider = "facebook" | "instagram";

export type LinkedMetaSelection = {
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

const getLinkedMetaDatabaseUrl = () =>
  getEnv("RAG_META_LINKED_DATABASE_URL") ??
  getEnv("AUTH_DATABASE_URL") ??
  getEnv("DATABASE_URL");

const summarizeScopes = (scopes: string[]) =>
  scopes.length > 0 ? scopes.join(", ") : "none granted";

const resolveSelectionMode = (selection: LinkedMetaSelection) => {
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

export const createLinkedMetaCredentialResolverFromEnv = async () => {
  const databaseUrl = getLinkedMetaDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Missing RAG_META_LINKED_DATABASE_URL, AUTH_DATABASE_URL, or DATABASE_URL for linked Meta sync",
    );
  }

  return createNeonOAuthLinkedProviderCredentialResolver({
    databaseUrl,
    providersConfiguration: createProvidersConfiguration({
      facebook: {
        connector: {
          credentials: {
            clientId: getRequiredEnv("FACEBOOK_CONNECTOR_CLIENT_ID"),
            clientSecret: getRequiredEnv("FACEBOOK_CONNECTOR_CLIENT_SECRET"),
            redirectUri: getRequiredEnv("OAUTH2_CALLBACK_URI"),
          },
          scope: [
            "pages_show_list",
            "pages_read_engagement",
            "instagram_basic",
          ],
        },
      },
    }),
  });
};

export const loadLinkedMetaStatus = async (
  provider: LinkedMetaProvider,
  selection: LinkedMetaSelection,
) => {
  const databaseUrl = getLinkedMetaDatabaseUrl();

  if (!databaseUrl) {
    return {
      linkedConnectorProvider: provider,
      linkedProviderConfigured: false,
      linkedProviderError:
        "Missing RAG_META_LINKED_DATABASE_URL, AUTH_DATABASE_URL, or DATABASE_URL",
      linkedProviderSelectionMode: resolveSelectionMode(selection),
    };
  }

  if (!selection.bindingId && !selection.ownerRef) {
    return {
      linkedConnectorProvider: provider,
      linkedProviderConfigured: false,
      linkedProviderError:
        "An authenticated user is required to resolve linked Meta bindings",
      linkedProviderSelectionMode: resolveSelectionMode(selection),
    };
  }

  const { bindingStore, grantStore } =
    createNeonLinkedProviderStores(databaseUrl);

  let binding: LinkedProviderBinding | undefined;
  let bindings: LinkedProviderBinding[] = [];

  if (selection.bindingId) {
    const candidate = await bindingStore.getBinding(selection.bindingId);
    if (candidate?.connectorProvider === provider) {
      binding = candidate;
    }
  }

  if (!binding && selection.ownerRef) {
    bindings = (
      await bindingStore.listBindingsByOwner(selection.ownerRef)
    ).filter(
      (candidate: LinkedProviderBinding) =>
        candidate.connectorProvider === provider,
    );
    binding = selection.externalAccountId
      ? bindings.find(
          (candidate: LinkedProviderBinding) =>
            candidate.externalAccountId === selection.externalAccountId,
        )
      : bindings[0];
  }

  const grant = binding
    ? await grantStore.getGrant(binding.grantId)
    : undefined;
  const grantedScopes = grant?.grantedScopes ?? binding?.availableScopes ?? [];

  return {
    linkedAccountLabel:
      binding?.label ??
      binding?.email ??
      binding?.username ??
      binding?.externalAccountId,
    linkedAvailableBindingCount: bindings.length,
    linkedBindingId: binding?.id ?? selection.bindingId,
    linkedBindingLabel: binding?.label,
    linkedBindingStatus: binding?.status ?? "missing",
    linkedConnectorProvider: provider,
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
