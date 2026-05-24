import { type AuthSessionStore, protectRoutePlugin } from "@absolutejs/auth";
import type {
  LinkedProviderBindingStore,
  LinkedProviderGrantStore,
} from "@absolutejs/linked-providers";
import { eq, or } from "drizzle-orm";
import { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { Elysia } from "elysia";
import { schema, SchemaType, User } from "../shared/auth/schema";
import {
  deleteDBAuthIdentityMergeRequest,
  mergeUserAccounts,
  removeDBAuthIdentity,
  setPrimaryAuthIdentity,
} from "../shared/handlers/userHandlers";
import {
  buildAuthIdentityPayload,
  buildLinkedProviderPayload,
} from "../shared/payloads";
const flattenIdentityGroups = <T>(identities: Record<string, T[]>) =>
  Object.values(identities).flat();

type ApiPluginDeps = {
  authSessionStore: AuthSessionStore<User>;
  bindingStore: LinkedProviderBindingStore;
  db: NeonHttpDatabase<SchemaType>;
  grantStore: LinkedProviderGrantStore;
};

export const apiPlugin = ({
  authSessionStore,
  bindingStore,
  db,
  grantStore,
}: ApiPluginDeps) => {
  const deps = { bindingStore, db, grantStore };

  return new Elysia({ prefix: "/api" })
    .use(protectRoutePlugin<User>({ authSessionStore }))
    .get("/auth-identities", ({ protectRoute }) =>
      protectRoute(async (user) => buildAuthIdentityPayload(deps, user.sub)),
    )
    .get("/linked-providers", ({ protectRoute }) =>
      protectRoute(async (user) => buildLinkedProviderPayload(deps, user.sub)),
    )
    .delete("/account", ({ protectRoute }) =>
      protectRoute(async (user) => {
        const grants = await grantStore.listGrantsByOwner(user.sub);

        for (const grant of grants) {
          if (typeof grantStore.removeGrant === "function") {
            await grantStore.removeGrant(grant.id);
          }
        }

        await db
          .delete(schema.authIdentityMergeRequests)
          .where(
            or(
              eq(schema.authIdentityMergeRequests.target_user_sub, user.sub),
              eq(schema.authIdentityMergeRequests.source_user_sub, user.sub),
            ),
          );

        await db
          .delete(schema.authIdentities)
          .where(eq(schema.authIdentities.user_sub, user.sub));

        await db.delete(schema.users).where(eq(schema.users.sub, user.sub));

        return { ok: true, removedUserSub: user.sub };
      }),
    )
    .post("/auth-identities/:id/primary", ({ params, protectRoute, status }) =>
      protectRoute(async (user) => {
        try {
          await setPrimaryAuthIdentity({
            db,
            identityId: params.id,
            userSub: user.sub,
          });
        } catch (error) {
          return status(
            "Not Found",
            error instanceof Error ? error.message : "Auth identity not found",
          );
        }

        return {
          ok: true,
          ...(await buildAuthIdentityPayload(deps, user.sub)),
        };
      }),
    )
    .post(
      "/auth-identity-merge-requests/:id/merge",
      ({ params, protectRoute, status }) =>
        protectRoute(async (user) => {
          try {
            await mergeUserAccounts({
              db,
              mergeRequestId: params.id,
              targetUserSub: user.sub,
            });
          } catch (error) {
            return status(
              "Bad Request",
              error instanceof Error ? error.message : "Merge failed",
            );
          }

          return {
            ok: true,
            ...(await buildAuthIdentityPayload(deps, user.sub)),
          };
        }),
    )
    .delete(
      "/auth-identity-merge-requests/:id",
      ({ params, protectRoute, status }) =>
        protectRoute(async (user) => {
          const payload = await buildAuthIdentityPayload(deps, user.sub);
          const mergeRequest = payload.mergeRequests.find(
            (candidate) => candidate.id === params.id,
          );

          if (!mergeRequest) {
            return status("Not Found", "Merge request not found");
          }

          await deleteDBAuthIdentityMergeRequest({
            db,
            id: mergeRequest.id,
          });

          return {
            ok: true,
            ...(await buildAuthIdentityPayload(deps, user.sub)),
          };
        }),
    )
    .delete("/auth-identities/:id", ({ params, protectRoute, status }) =>
      protectRoute(async (user) => {
        const payload = await buildAuthIdentityPayload(deps, user.sub);
        const allIdentities = flattenIdentityGroups(payload.identities);
        const identity = allIdentities.find(
          (candidate) => candidate.id === params.id,
        );

        if (!identity) {
          return status("Not Found", "Auth identity not found");
        }

        if (allIdentities.length <= 1) {
          return status("Bad Request", "Cannot remove the last login identity");
        }

        if (identity.isPrimary === true) {
          return status(
            "Bad Request",
            "Cannot remove the primary login identity yet",
          );
        }

        await removeDBAuthIdentity({ db, id: identity.id });

        return {
          ok: true,
          removed: {
            authProvider: identity.auth_provider,
            id: identity.id,
            providerSubject: identity.provider_subject,
          },
          ...(await buildAuthIdentityPayload(deps, user.sub)),
        };
      }),
    )
    .delete(
      "/linked-providers/bindings/:id",
      ({ params, protectRoute, status }) =>
        protectRoute(async (user) => {
          const bindings = await bindingStore.listBindingsByOwner(user.sub);
          const binding = bindings.find(
            (candidate) => candidate.id === params.id,
          );

          if (!binding) {
            return status("Not Found", "Linked provider binding not found");
          }

          if (typeof bindingStore.removeBinding !== "function") {
            return status(
              "Not Implemented",
              "Linked provider binding removal is not supported by this store",
            );
          }

          await bindingStore.removeBinding(binding.id);

          return {
            ok: true,
            removed: {
              bindingId: binding.id,
              connectorProvider: binding.connectorProvider,
              externalAccountId: binding.externalAccountId,
            },
            ...(await buildLinkedProviderPayload(deps, user.sub)),
          };
        }),
    )
    .delete(
      "/linked-providers/grants/:id",
      ({ params, protectRoute, status }) =>
        protectRoute(async (user) => {
          const grant = await grantStore.getGrant(params.id);

          if (!grant || grant.ownerRef !== user.sub) {
            return status("Not Found", "Linked provider grant not found");
          }

          if (typeof grantStore.removeGrant !== "function") {
            return status(
              "Not Implemented",
              "Linked provider grant removal is not supported by this store",
            );
          }

          await grantStore.removeGrant(grant.id);

          return {
            ok: true,
            removed: {
              authProviderKey: grant.authProviderKey,
              grantId: grant.id,
              providerSubject: grant.providerSubject,
            },
            ...(await buildLinkedProviderPayload(deps, user.sub)),
          };
        }),
    );
};
