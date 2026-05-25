import type {
  AuthIdentityPayload,
  AuthUser,
  LinkedProviderPayload,
} from "./types";

const request = async <T>(path: string, method = "GET") => {
  const response = await fetch(path, { method });

  if (!response.ok) {
    const message = (await response.text()).replace(/^"|"$/g, "");

    throw new Error(message || response.statusText);
  }

  const data: T = await response.json();

  return data;
};

export const deleteAccount = () =>
  request<{ ok: boolean; removedUserSub: string }>("/api/account", "DELETE");
export const dismissMergeRequest = (id: string) =>
  request<AuthIdentityPayload>(
    `/api/auth-identity-merge-requests/${id}`,
    "DELETE",
  );
export const fetchAuthIdentities = () =>
  request<AuthIdentityPayload>("/api/auth-identities");
export const fetchAuthStatus = async () => {
  const response = await fetch("/oauth2/status");

  if (!response.ok) {
    return null;
  }

  const data: { user?: AuthUser | null } = await response.json();

  return data.user ?? null;
};
export const fetchLinkedProviders = () =>
  request<LinkedProviderPayload>("/api/linked-providers");
export const mergeAccount = (id: string) =>
  request<AuthIdentityPayload>(
    `/api/auth-identity-merge-requests/${id}/merge`,
    "POST",
  );
export const removeBinding = (id: string) =>
  request<LinkedProviderPayload>(
    `/api/linked-providers/bindings/${id}`,
    "DELETE",
  );
export const removeGrant = (id: string) =>
  request<LinkedProviderPayload>(
    `/api/linked-providers/grants/${id}`,
    "DELETE",
  );
export const removeIdentity = (id: string) =>
  request<AuthIdentityPayload>(`/api/auth-identities/${id}`, "DELETE");
export const setPrimaryIdentity = (id: string) =>
  request<AuthIdentityPayload>(`/api/auth-identities/${id}/primary`, "POST");
export const signOut = async () => {
  await fetch("/oauth2/signout", { method: "DELETE" });
};
