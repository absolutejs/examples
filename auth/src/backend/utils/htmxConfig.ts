import { defineAuthHtmxConfig } from "@absolutejs/auth";
import type {
  LinkedProviderBindingStore,
  LinkedProviderGrantStore,
} from "@absolutejs/linked-providers";
import { eq, or } from "drizzle-orm";
import { NeonHttpDatabase } from "drizzle-orm/neon-http";
import {
  CONNECTOR_TARGETS,
  FEATURED_LOGIN_PROVIDERS,
} from "../../frontend/shared/navData";
import { authorizationHref } from "../../frontend/shared/oauth";
import { providerData } from "../../frontend/shared/providerData";
import { schema, SchemaType } from "../../../db/schema";
import {
  deleteDBAuthIdentityMergeRequest,
  mergeUserAccounts,
  removeDBAuthIdentity,
  setPrimaryAuthIdentity,
} from "../handlers/userHandlers";
import {
  buildAuthIdentityPayload,
  buildLinkedProviderPayload,
} from "./payloads";

type AuthHtmxConfigDeps = {
  bindingStore: LinkedProviderBindingStore;
  db: NeonHttpDatabase<SchemaType>;
  grantStore: LinkedProviderGrantStore;
};

// The `htmx` option for auth: provider display data + the OAuth href
// builder for the renderers, plus this app's identity/connector data actions.
// @absolutejs/auth owns the routes, gating and fragment HTML.
export const authHtmxConfig = ({
  bindingStore,
  db,
  grantStore,
}: AuthHtmxConfigDeps) =>
  defineAuthHtmxConfig({
    authorizationHref,
    connectorTargets: CONNECTOR_TARGETS,
    featuredLoginProviders: FEATURED_LOGIN_PROVIDERS,
    providerData,
    deleteAccount: async ({ userSub }) => {
      const grants = await grantStore.listGrantsByOwner(userSub);
      for (const grant of grants) {
        await grantStore.removeGrant?.(grant.id);
      }
      await db
        .delete(schema.authIdentityMergeRequests)
        .where(
          or(
            eq(schema.authIdentityMergeRequests.target_user_sub, userSub),
            eq(schema.authIdentityMergeRequests.source_user_sub, userSub),
          ),
        );
      await db
        .delete(schema.authIdentities)
        .where(eq(schema.authIdentities.user_sub, userSub));
      await db.delete(schema.users).where(eq(schema.users.sub, userSub));
    },
    dismissMergeRequest: ({ mergeRequestId }) =>
      deleteDBAuthIdentityMergeRequest({ db, id: mergeRequestId }),
    loadAuthIdentities: (userSub) =>
      buildAuthIdentityPayload({ bindingStore, db, grantStore }, userSub),
    loadLinkedProviders: (userSub) =>
      buildLinkedProviderPayload({ bindingStore, db, grantStore }, userSub),
    mergeIdentity: ({ mergeRequestId, userSub }) =>
      mergeUserAccounts({ db, mergeRequestId, targetUserSub: userSub }),
    removeBinding: async ({ bindingId, userSub }) => {
      const bindings = await bindingStore.listBindingsByOwner(userSub);
      const binding = bindings.find((candidate) => candidate.id === bindingId);
      if (binding) {
        await bindingStore.removeBinding?.(binding.id);
      }
    },
    removeGrant: async ({ grantId, userSub }) => {
      const grant = await grantStore.getGrant(grantId);
      if (grant && grant.ownerRef === userSub) {
        await grantStore.removeGrant?.(grant.id);
      }
    },
    removeIdentity: ({ identityId }) =>
      removeDBAuthIdentity({ db, id: identityId }),
    setPrimaryIdentity: ({ identityId, userSub }) =>
      setPrimaryAuthIdentity({ db, identityId, userSub }),
  });
