import type {
  LinkedProviderBinding,
  LinkedProviderGrant,
} from "@absolutejs/linked-providers";

export type AuthUser = {
  sub: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
  primary_auth_identity_id: string | null;
};

export type AuthIdentity = {
  id: string;
  user_sub: string;
  auth_provider: string;
  provider_subject: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  isPrimary: boolean;
};

type AuthIdentityMergeRequest = {
  id: string;
  target_user_sub: string;
  source_user_sub: string;
  conflicting_auth_provider: string;
  conflicting_provider_subject: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type AuthIdentityPayload = {
  identities: Record<string, AuthIdentity[]>;
  mergeRequests: AuthIdentityMergeRequest[];
  primaryIdentityId: string | null | undefined;
  userSub: string;
};

export type LinkedProviderBindingView = LinkedProviderBinding & {
  grantStatus?: string;
  grantUpdatedAt?: number;
};

export type LinkedProviderPayload = {
  ownerRef: string;
  grants: LinkedProviderGrant[];
  bindings: LinkedProviderBindingView[];
};
