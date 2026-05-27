import { networking } from "@absolutejs/absolute";
import { isUserSessionId } from "@absolutejs/auth";
import { type AnyElysia, Elysia } from "elysia";
import {
  getDemoPagePath,
  isBackendMode,
  isFrameworkId,
} from "../../frontend/demo-backends";
import { type AuthUser, buildRagAbsoluteAuth } from "../shared/auth/config";
import { createWebRuntime } from "./handlers/runtime/createWebRuntime";
import { renderAuthMenu } from "./handlers/renderAuthMenu";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { createRagProxyPlugin } from "./plugins/ragProxyPlugin";

const runtime = await createWebRuntime();

// Widen the auth plugin so TS doesn't accumulate its ~40 route types into the
// chain (TS2590 / vue-tsc OOM since @absolutejs/auth 0.32). Same pattern intent
// uses; mount order + runtime are unchanged.
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentional type-erasure to keep the .use() chain under TS's union budget; see comment above
const authPlugin = buildRagAbsoluteAuth({
  authDatabaseUrl: runtime.authDatabaseUrl,
  authSessionStore: runtime.authSessionStore,
}) as Promise<AnyElysia>;

export const server = new Elysia()
  .use(authPlugin)
  .use(pagesPlugin(runtime.manifest, { backends: runtime.backendDescriptors }))
  // Public auth-state fragment for the HTMX page. protectRoute's second arg lets
  // us answer 200 either way (no 401 in the console); when a session exists we
  // emit the `ragAuthReady` HX-Trigger so the gated panels load themselves.
  .get("/demo/auth/htmx", (context) =>
    context.protectRoute(
      (user: AuthUser) => {
        context.set.headers["HX-Trigger"] = "ragAuthReady";

        return renderAuthMenu(user);
      },
      () => renderAuthMenu(null),
    ),
  )
  // No-JS sign-out: clear the session + cookies and bounce back to the HTMX
  // page the user signed out from.
  .get("/demo/signout", async ({ cookie, request }) => {
    const sessionId = cookie.user_session_id?.value;
    // UserSessionId is a UUID-shaped template-literal brand since 0.32 — the
    // type guard verifies the shape before passing to the store.
    if (isUserSessionId(sessionId)) {
      try {
        await runtime.authSessionStore.removeSession(sessionId);
        await runtime.authSessionStore.removeUnregisteredSession(sessionId);
      } catch {}
    }
    cookie.user_session_id?.remove();
    cookie.auth_provider?.remove();

    const referer = request.headers.get("referer");
    const location =
      referer && referer.includes("/htmx/") ? referer : "/htmx/sqlite-native";

    return new Response(null, { headers: { Location: location }, status: 303 });
  })
  // No-JS nav for the HTMX page: the backend/framework <select>s fire an htmx
  // request on change; we answer with an HX-Redirect so htmx navigates the
  // browser to the chosen demo (same destinations as the other framework navs).
  .get("/demo/nav", ({ query, set }) => {
    const framework = isFrameworkId(query.framework) ? query.framework : "htmx";
    const backend = isBackendMode(query.backend)
      ? query.backend
      : "sqlite-native";
    set.headers["HX-Redirect"] = getDemoPagePath(framework, backend);

    return new Response(null, { status: 204 });
  })
  .use(createRagProxyPlugin())
  .use(runtime.absolutejs)
  .use(networking)
  .on("error", ({ code, error, request }) => {
    console.error(
      `Server error [${code}] on ${request.method} ${request.url}: ${error.message ?? ""}`,
    );
  });

export type Server = typeof server;
