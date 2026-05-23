import { join } from "node:path";
import {
  asset,
  generateHeadElement,
  handleHTMLPageRequest,
  handleHTMXPageRequest,
} from "@absolutejs/absolute";
import { handleAngularPageRequest } from "@absolutejs/absolute/angular";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { handleSveltePageRequest } from "@absolutejs/absolute/svelte";
import { handleVuePageRequest } from "@absolutejs/absolute/vue";
import { file } from "bun";
import { Elysia } from "elysia";
import type * as AngularAuthPage from "../../frontend/angular/pages/angular-auth";
import type SvelteAuth from "../../frontend/svelte/pages/SvelteAuth.svelte";
import type VueAuth from "../../frontend/vue/pages/VueAuth.vue";
import { ReactAuth } from "../../frontend/react/pages/ReactAuth";

const FRAMEWORK_LINKS = [
  ["/react", "React"],
  ["/vue", "Vue"],
  ["/svelte", "Svelte"],
  ["/angular", "Angular"],
  ["/html", "HTML"],
  ["/htmx", "HTMX"],
];

const landingPage = (cssPath: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AbsoluteJS Auth example</title>
    <link rel="icon" href="/assets/favicon.ico" />
    <link rel="stylesheet" href="${cssPath}" />
  </head>
  <body class="auth-body">
    <div class="landing">
      <img alt="" height="56" src="/assets/png/absolutejs-temp.png" />
      <h1 class="page-heading">AbsoluteJS Auth</h1>
      <p class="muted">
        One OAuth2 backend (@absolutejs/auth) — the same login, identity
        linking, and connector demo in six frameworks, sharing one CSS file.
      </p>
      <div class="landing__grid">
        ${FRAMEWORK_LINKS.map(
          ([href, label]) =>
            `<a class="landing__card" href="${href}">${label}</a>`,
        ).join("")}
      </div>
    </div>
  </body>
</html>`;

export const pagesPlugin = (manifest: Record<string, string>) => {
  const cssPath = asset(manifest, "AuthCSS");

  const reactHandler = ({ request }: { request: Request }) =>
    handleReactPageRequest({
      index: asset(manifest, "ReactAuthIndex"),
      Page: ReactAuth,
      props: { cssPath },
      request,
    });

  const vueHandler = ({ request }: { request: Request }) =>
    handleVuePageRequest<typeof VueAuth>({
      headTag: generateHeadElement({ cssPath, title: "AbsoluteJS Auth — Vue" }),
      indexPath: asset(manifest, "VueAuthIndex"),
      pagePath: asset(manifest, "VueAuth"),
      props: { cssPath },
      request,
    });

  const svelteHandler = ({ request }: { request: Request }) =>
    handleSveltePageRequest<typeof SvelteAuth>({
      indexPath: asset(manifest, "SvelteAuthIndex"),
      pagePath: asset(manifest, "SvelteAuth"),
      props: { cssPath },
      request,
    });

  const htmlHandler = () => handleHTMLPageRequest(asset(manifest, "HtmlAuth"));

  return (
    new Elysia()
      .get(
        "/",
        () =>
          new Response(landingPage(cssPath), {
            headers: { "content-type": "text/html; charset=utf-8" },
          }),
      )
      .get("/react", reactHandler)
      .get("/react/*", reactHandler)
      .get("/vue", vueHandler)
      .get("/vue/*", vueHandler)
      .get("/svelte", svelteHandler)
      .get("/svelte/*", svelteHandler)
      // The Angular handler is inlined into both `.get` calls on purpose: the
      // build's AST scan walks up from each `handleAngularPageRequest` call to
      // its enclosing mount, and the `/angular/*` mount is what makes it infer
      // `APP_BASE_HREF: "/angular/"` and inject it alongside
      // `provideRouter(routes)` into the page's SSR bundle. Extracting the call
      // into a shared const would hide the mount from the scanner and break the
      // inferred base href, so each route keeps its own inline call.
      .get("/angular", ({ request }) =>
        handleAngularPageRequest<AngularAuthPage.Context>({
          headTag: generateHeadElement({
            cssPath,
            title: "AbsoluteJS Auth — Angular",
          }),
          indexPath: asset(manifest, "AngularAuthIndex"),
          pagePath: asset(manifest, "AngularAuth"),
          request,
          requestContext: {},
        }),
      )
      .get("/angular/*", ({ request }) =>
        handleAngularPageRequest<AngularAuthPage.Context>({
          headTag: generateHeadElement({
            cssPath,
            title: "AbsoluteJS Auth — Angular",
          }),
          indexPath: asset(manifest, "AngularAuthIndex"),
          pagePath: asset(manifest, "AngularAuth"),
          request,
          requestContext: {},
        }),
      )
      .get("/html", htmlHandler)
      .get("/html/protected", htmlHandler)
      .get("/html/settings", htmlHandler)
      .get("/html/connectors", htmlHandler)
      .get(
        "/htmx/htmx.min.js",
        () =>
          new Response(
            file(
              join(
                process.cwd(),
                "src",
                "frontend",
                "htmx",
                "htmx.2.0.6.min.js",
              ),
            ),
            {
              headers: {
                "content-type": "application/javascript; charset=utf-8",
              },
            },
          ),
      )
      .get("/htmx", () =>
        handleHTMXPageRequest(asset(manifest, "HtmxAuthHome")),
      )
      .get("/htmx/protected", () =>
        handleHTMXPageRequest(asset(manifest, "HtmxAuthProtected")),
      )
      .get("/htmx/settings", () =>
        handleHTMXPageRequest(asset(manifest, "HtmxAuthSettings")),
      )
      .get("/htmx/connectors", () =>
        handleHTMXPageRequest(asset(manifest, "HtmxAuthConnectors")),
      )
  );
};
