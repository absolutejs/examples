import { networking } from "@absolutejs/absolute";
import { Elysia } from "elysia";
import {
  getDemoPagePath,
  isBackendMode,
  isFrameworkId,
} from "../../frontend/demo-backends";
import { buildRagAbsoluteAuth } from "../shared/auth/config";
import { createWebRuntime } from "./handlers/runtime/createWebRuntime";
import { renderAuthMenu } from "./handlers/renderAuthMenu";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { createRagProxyPlugin } from "./plugins/ragProxyPlugin";

const runtime = await createWebRuntime();

export const server = new Elysia()
  .use(
    await buildRagAbsoluteAuth({
      authDatabaseUrl: runtime.authDatabaseUrl,
      authSessionStore: runtime.authSessionStore,
    }),
  )
  .use(pagesPlugin(runtime.manifest, { backends: runtime.backendDescriptors }))
  // Public auth-state fragment for the HTMX page. protectRoute's second arg lets
  // us answer 200 either way (no 401 in the console); when a session exists we
  // emit the `ragAuthReady` HX-Trigger so the gated panels load themselves.
  .get("/demo/auth/htmx", (context) =>
    context.protectRoute(
      (user) => {
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
    if (typeof sessionId === "string" && sessionId.length > 0) {
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
