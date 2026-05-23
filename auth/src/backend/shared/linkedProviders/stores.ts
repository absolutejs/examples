import type {
  LinkedProviderBinding,
  LinkedProviderBindingStore,
  LinkedProviderGrant,
  LinkedProviderGrantStore,
} from "@absolutejs/linked-providers";
import { desc, eq } from "drizzle-orm";
import { NeonHttpDatabase } from "drizzle-orm/neon-http";
import {
  linkedProviderBindings,
  linkedProviderGrants,
  LinkedProviderBindingRow,
  LinkedProviderGrantRow,
  SchemaType,
} from "../auth/schema";

const toTimestamp = (value: number | undefined) =>
  value === undefined ? null : new Date(value);

const fromTimestamp = (value: Date | null) =>
  value === null ? undefined : value.getTime();

const toGrant = (row: LinkedProviderGrantRow): LinkedProviderGrant => ({
  accessTokenCiphertext: row.access_token_ciphertext ?? undefined,
  authProviderKey: row.auth_provider_key,
  createdAt: row.created_at.getTime(),
  expiresAt: fromTimestamp(row.expires_at),
  grantedScopes: row.granted_scopes ?? [],
  id: row.id,
  lastRefreshedAt: fromTimestamp(row.last_refreshed_at),
  lastRefreshError: row.last_refresh_error ?? undefined,
  metadata: row.metadata ?? undefined,
  ownerRef: row.owner_ref,
  providerFamily: row.provider_family,
  providerSubject: row.provider_subject,
  refreshTokenCiphertext: row.refresh_token_ciphertext ?? undefined,
  status: row.status as LinkedProviderGrant["status"],
  tokenType: row.token_type ?? undefined,
  updatedAt: row.updated_at.getTime(),
});

const toBinding = (row: LinkedProviderBindingRow): LinkedProviderBinding => ({
  availableScopes: row.available_scopes ?? [],
  capabilities: row.capabilities ?? undefined,
  connectorProvider: row.connector_provider,
  createdAt: row.created_at.getTime(),
  email: row.email ?? undefined,
  externalAccountId: row.external_account_id,
  externalAccountType: row.external_account_type,
  grantId: row.grant_id,
  id: row.id,
  label: row.label ?? undefined,
  metadata: row.metadata ?? undefined,
  status: row.status as LinkedProviderBinding["status"],
  updatedAt: row.updated_at.getTime(),
  username: row.username ?? undefined,
});

export const createDrizzleLinkedProviderBindingStore = (
  db: NeonHttpDatabase<SchemaType>,
): LinkedProviderBindingStore => ({
  getBinding: async (id) => {
    const [row] = await db
      .select()
      .from(linkedProviderBindings)
      .where(eq(linkedProviderBindings.id, id))
      .limit(1);

    return row ? toBinding(row) : undefined;
  },
  listBindingsByGrant: async (grantId) => {
    const rows = await db
      .select()
      .from(linkedProviderBindings)
      .where(eq(linkedProviderBindings.grant_id, grantId))
      .orderBy(desc(linkedProviderBindings.updated_at));

    return rows.map(toBinding);
  },
  listBindingsByOwner: async (ownerRef) => {
    const rows = await db
      .select({ binding: linkedProviderBindings })
      .from(linkedProviderBindings)
      .innerJoin(
        linkedProviderGrants,
        eq(linkedProviderBindings.grant_id, linkedProviderGrants.id),
      )
      .where(eq(linkedProviderGrants.owner_ref, ownerRef))
      .orderBy(desc(linkedProviderBindings.updated_at));

    return rows.map(({ binding }) => toBinding(binding));
  },
  removeBinding: async (id) => {
    await db
      .delete(linkedProviderBindings)
      .where(eq(linkedProviderBindings.id, id));
  },
  saveBinding: async (binding) => {
    await db
      .insert(linkedProviderBindings)
      .values({
        available_scopes: binding.availableScopes,
        capabilities: binding.capabilities ?? [],
        connector_provider: binding.connectorProvider,
        created_at: new Date(binding.createdAt),
        email: binding.email ?? null,
        external_account_id: binding.externalAccountId,
        external_account_type: binding.externalAccountType,
        grant_id: binding.grantId,
        id: binding.id,
        label: binding.label ?? null,
        metadata: binding.metadata ?? {},
        status: binding.status,
        updated_at: new Date(binding.updatedAt),
        username: binding.username ?? null,
      })
      .onConflictDoUpdate({
        set: {
          available_scopes: binding.availableScopes,
          capabilities: binding.capabilities ?? [],
          connector_provider: binding.connectorProvider,
          email: binding.email ?? null,
          external_account_id: binding.externalAccountId,
          external_account_type: binding.externalAccountType,
          grant_id: binding.grantId,
          label: binding.label ?? null,
          metadata: binding.metadata ?? {},
          status: binding.status,
          updated_at: new Date(binding.updatedAt),
          username: binding.username ?? null,
        },
        target: linkedProviderBindings.id,
      });
  },
});
export const createDrizzleLinkedProviderGrantStore = (
  db: NeonHttpDatabase<SchemaType>,
): LinkedProviderGrantStore => ({
  getGrant: async (id) => {
    const [row] = await db
      .select()
      .from(linkedProviderGrants)
      .where(eq(linkedProviderGrants.id, id))
      .limit(1);

    return row ? toGrant(row) : undefined;
  },
  listGrantsByOwner: async (ownerRef) => {
    const rows = await db
      .select()
      .from(linkedProviderGrants)
      .where(eq(linkedProviderGrants.owner_ref, ownerRef))
      .orderBy(desc(linkedProviderGrants.updated_at));

    return rows.map(toGrant);
  },
  removeGrant: async (id) => {
    await db
      .delete(linkedProviderBindings)
      .where(eq(linkedProviderBindings.grant_id, id));
    await db
      .delete(linkedProviderGrants)
      .where(eq(linkedProviderGrants.id, id));
  },
  saveGrant: async (grant) => {
    await db
      .insert(linkedProviderGrants)
      .values({
        access_token_ciphertext: grant.accessTokenCiphertext ?? null,
        auth_provider_key: grant.authProviderKey,
        created_at: new Date(grant.createdAt),
        expires_at: toTimestamp(grant.expiresAt),
        granted_scopes: grant.grantedScopes,
        id: grant.id,
        last_refresh_error: grant.lastRefreshError ?? null,
        last_refreshed_at: toTimestamp(grant.lastRefreshedAt),
        metadata: grant.metadata ?? {},
        owner_ref: grant.ownerRef,
        provider_family: grant.providerFamily,
        provider_subject: grant.providerSubject,
        refresh_token_ciphertext: grant.refreshTokenCiphertext ?? null,
        status: grant.status,
        token_type: grant.tokenType ?? null,
        updated_at: new Date(grant.updatedAt),
      })
      .onConflictDoUpdate({
        set: {
          access_token_ciphertext: grant.accessTokenCiphertext ?? null,
          auth_provider_key: grant.authProviderKey,
          expires_at: toTimestamp(grant.expiresAt),
          granted_scopes: grant.grantedScopes,
          last_refresh_error: grant.lastRefreshError ?? null,
          last_refreshed_at: toTimestamp(grant.lastRefreshedAt),
          metadata: grant.metadata ?? {},
          owner_ref: grant.ownerRef,
          provider_family: grant.providerFamily,
          provider_subject: grant.providerSubject,
          refresh_token_ciphertext: grant.refreshTokenCiphertext ?? null,
          status: grant.status,
          token_type: grant.tokenType ?? null,
          updated_at: new Date(grant.updatedAt),
        },
        target: linkedProviderGrants.id,
      });
  },
});
export const createDrizzleLinkedProviderStores = (
  db: NeonHttpDatabase<SchemaType>,
) => ({
  bindingStore: createDrizzleLinkedProviderBindingStore(db),
  grantStore: createDrizzleLinkedProviderGrantStore(db),
});
