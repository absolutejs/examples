import { isUserSessionId, protectRoutePlugin } from "@absolutejs/auth";
import { resolveAuthHtmxRenderers } from "@absolutejs/auth/ui";
import { isValidProviderOption } from "citra";
import { eq, or } from "drizzle-orm";
import { Elysia } from "elysia";
import {
  CONNECTOR_TARGETS,
  FEATURED_LOGIN_PROVIDERS,
} from "../../frontend/shared/navData";
import { authorizationHref } from "../../frontend/shared/oauth";
import { providerData } from "../../frontend/shared/providerData";
import { schema, User } from "../shared/auth/schema";
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
import { AuthRuntime } from "../shared/runtime";

const SEE_OTHER = 303;

// The auth HTMX fragments ship in @absolutejs/auth — resolve them with this
// app's provider data + OAuth href builder. Pass `render` to override any one.
const renderers = resolveAuthHtmxRenderers({
  authorizationHref,
  connectorTargets: CONNECTOR_TARGETS,
  featuredLoginProviders: FEATURED_LOGIN_PROVIDERS,
  providerData,
});

const html = (markup: string) =>
  new Response(markup, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });

const signInPrompt = `<section class="auth-content"><h1 class="page-heading">Not authorized</h1><p class="muted">You need to sign in to view this page.</p><a class="btn btn--primary" href="/htmx">Go to sign in</a></section>`;

export const htmxFragmentsPlugin = ({
  authSessionStore,
  bindingStore,
  db,
  grantStore,
}: AuthRuntime) => {
  const deps = { bindingStore, db, grantStore };

  return new Elysia()
    .use(protectRoutePlugin<User>({ authSessionStore }))
    .get("/htmx/login", () =>
      html(renderers.providerLogin("Sign in with", true)),
    )
    .get("/htmx/link", () => html(renderers.providerLogin("Link", false)))
    .get("/htmx/connector-links", () => html(renderers.connectorLinks()))
    .get("/htmx/auth-menu", ({ protectRoute }) =>
      protectRoute(
        (user) => html(renderers.authMenu(user)),
        () => html(renderers.authMenu(null)),
      ),
    )
    .get("/htmx/me", ({ protectRoute }) =>
      protectRoute(
        (user) => html(renderers.protected(user)),
        () => html(signInPrompt),
      ),
    )
    .get("/htmx/account", ({ protectRoute }) =>
      protectRoute(
        (user) => html(renderers.account(user)),
        () => html(signInPrompt),
      ),
    )
    .get("/htmx/identities", ({ protectRoute, query }) =>
      protectRoute(async (user) => {
        const search = typeof query.query === "string" ? query.query : "";

        return html(
          renderers.identities(
            await buildAuthIdentityPayload(deps, user.sub),
            search,
          ),
        );
      }),
    )
    .post("/htmx/identities/:id/primary", ({ params, protectRoute }) =>
      protectRoute(async (user) => {
        try {
          await setPrimaryAuthIdentity({
            db,
            identityId: params.id,
            userSub: user.sub,
          });
        } catch {
          // ignore — re-render reflects current state
        }

        return html(
          renderers.identities(
            await buildAuthIdentityPayload(deps, user.sub),
            "",
          ),
        );
      }),
    )
    .delete("/htmx/identities/:id", ({ params, protectRoute }) =>
      protectRoute(async (user) => {
        const payload = await buildAuthIdentityPayload(deps, user.sub);
        const identities = Object.values(payload.identities).flat();
        const identity = identities.find(
          (candidate) => candidate.id === params.id,
        );
        if (identity && identities.length > 1 && identity.isPrimary !== true) {
          await removeDBAuthIdentity({ db, id: identity.id });
        }

        return html(
          renderers.identities(
            await buildAuthIdentityPayload(deps, user.sub),
            "",
          ),
        );
      }),
    )
    .post("/htmx/merge/:id", ({ params, protectRoute }) =>
      protectRoute(async (user) => {
        try {
          await mergeUserAccounts({
            db,
            mergeRequestId: params.id,
            targetUserSub: user.sub,
          });
        } catch {
          // ignore — re-render reflects current state
        }

        return html(
          renderers.identities(
            await buildAuthIdentityPayload(deps, user.sub),
            "",
          ),
        );
      }),
    )
    .delete("/htmx/merge/:id", ({ params, protectRoute }) =>
      protectRoute(async (user) => {
        await deleteDBAuthIdentityMergeRequest({ db, id: params.id });

        return html(
          renderers.identities(
            await buildAuthIdentityPayload(deps, user.sub),
            "",
          ),
        );
      }),
    )
    .get("/htmx/connector-list", ({ protectRoute }) =>
      protectRoute(
        async (user) =>
          html(
            renderers.connectors(
              await buildLinkedProviderPayload(deps, user.sub),
            ),
          ),
        () => html(signInPrompt),
      ),
    )
    .delete("/htmx/connectors/grants/:id", ({ params, protectRoute }) =>
      protectRoute(async (user) => {
        const grant = await grantStore.getGrant(params.id);
        if (grant && grant.ownerRef === user.sub) {
          await grantStore.removeGrant?.(grant.id);
        }

        return html(
          renderers.connectors(
            await buildLinkedProviderPayload(deps, user.sub),
          ),
        );
      }),
    )
    .delete("/htmx/connectors/bindings/:id", ({ params, protectRoute }) =>
      protectRoute(async (user) => {
        const bindings = await bindingStore.listBindingsByOwner(user.sub);
        const binding = bindings.find(
          (candidate) => candidate.id === params.id,
        );
        if (binding) {
          await bindingStore.removeBinding?.(binding.id);
        }

        return html(
          renderers.connectors(
            await buildLinkedProviderPayload(deps, user.sub),
          ),
        );
      }),
    )
    .get("/htmx/login-redirect", ({ query, redirect }) => {
      const provider = typeof query.provider === "string" ? query.provider : "";

      return redirect(
        isValidProviderOption(provider) ? authorizationHref(provider) : "/htmx",
      );
    })
    .post("/htmx/delete-account", (context) =>
      context.protectRoute(async (user) => {
        const confirm =
          typeof context.body === "object" &&
          context.body !== null &&
          "confirm" in context.body
            ? String(context.body.confirm)
            : "";
        if (confirm !== "DELETE") {
          return html(
            `<div class="error-banner">Type DELETE to confirm.</div>`,
          );
        }

        const grants = await grantStore.listGrantsByOwner(user.sub);
        for (const grant of grants) {
          await grantStore.removeGrant?.(grant.id);
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

        context.set.headers["HX-Redirect"] = "/htmx";

        return html("");
      }),
    )
    .get("/htmx/signout", async ({ cookie: { user_session_id }, redirect }) => {
      const sessionId = user_session_id.value;
      if (sessionId !== undefined && isUserSessionId(sessionId)) {
        await authSessionStore.removeSession(sessionId);
      }
      user_session_id.remove();

      return redirect("/htmx", SEE_OTHER);
    });
};
