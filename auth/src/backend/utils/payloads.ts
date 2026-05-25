import type {
  LinkedProviderBindingStore,
  LinkedProviderGrantStore,
} from "@absolutejs/linked-providers";
import { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { SchemaType } from "../../../db/schema";
import {
  getDBUser,
  listDBAuthIdentitiesByUser,
  listDBAuthIdentityMergeRequestsByTarget,
} from "../handlers/userHandlers";

export type PayloadDeps = {
  bindingStore: LinkedProviderBindingStore;
  db: NeonHttpDatabase<SchemaType>;
  grantStore: LinkedProviderGrantStore;
};

type AuthIdentityWithPrimary = Awaited<
  ReturnType<typeof listDBAuthIdentitiesByUser>
>[number] & { isPrimary: boolean };

export const buildAuthIdentityPayload = async (
  { db }: PayloadDeps,
  userSub: string,
) => {
  const [user, identityRows, mergeRequests] = await Promise.all([
    getDBUser({ db, userSub }),
    listDBAuthIdentitiesByUser({ db, userSub }),
    listDBAuthIdentityMergeRequestsByTarget({ db, targetUserSub: userSub }),
  ]);

  const primaryIdentityId = user?.primary_auth_identity_id;
  const identities = identityRows
    .map((identity) => ({
      ...identity,
      isPrimary:
        primaryIdentityId !== null && primaryIdentityId !== undefined
          ? identity.id === primaryIdentityId
          : `${identity.auth_provider.toUpperCase()}|${identity.provider_subject}` ===
            userSub,
    }))
    .reduce<Record<string, AuthIdentityWithPrimary[]>>((groups, identity) => {
      const key = identity.auth_provider.toLowerCase();
      (groups[key] ??= []).push(identity);

      return groups;
    }, {});

  return {
    identities,
    mergeRequests,
    primaryIdentityId,
    userSub,
  };
};
export const buildLinkedProviderPayload = async (
  { bindingStore, grantStore }: PayloadDeps,
  ownerRef: string,
) => {
  const [grants, bindings] = await Promise.all([
    grantStore.listGrantsByOwner(ownerRef),
    bindingStore.listBindingsByOwner(ownerRef),
  ]);
  const grantById = new Map(grants.map((grant) => [grant.id, grant] as const));

  return {
    bindings: bindings.map((binding) => ({
      ...binding,
      grantStatus: grantById.get(binding.grantId)?.status,
      grantUpdatedAt: grantById.get(binding.grantId)?.updatedAt,
    })),
    grants,
    ownerRef,
  };
};

export type AuthIdentityPayload = Awaited<
  ReturnType<typeof buildAuthIdentityPayload>
>;
export type LinkedProviderPayload = Awaited<
  ReturnType<typeof buildLinkedProviderPayload>
>;
