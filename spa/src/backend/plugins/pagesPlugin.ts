import type SvelteSpa from "../../frontend/svelte/pages/SvelteSpa.svelte";
import type VueI18n from "../../frontend/vue/pages/VueI18n.vue";
import type VuePinia from "../../frontend/vue/pages/VuePinia.vue";
import type VueSpa from "../../frontend/vue/pages/VueSpa.vue";
import type * as AngularSpaPage from "../../frontend/angular/pages/angular-spa";
import { Elysia } from "elysia";
import { asset, generateHeadElement } from "@absolutejs/absolute";
import { handleAngularPageRequest } from "@absolutejs/absolute/angular";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { handleSveltePageRequest } from "@absolutejs/absolute/svelte";
import { handleVuePageRequest } from "@absolutejs/absolute/vue";
import { ReactSpa } from "../../frontend/react/pages/ReactSpa";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const sharedCssPath = asset(manifest, "SpaCSS");

  const reactHandler = ({ request }: { request: Request }) =>
    handleReactPageRequest({
      index: asset(manifest, "ReactSpaIndex"),
      Page: ReactSpa,
      props: { cssPath: sharedCssPath },
      request,
    });

  const svelteHandler = ({ request }: { request: Request }) =>
    handleSveltePageRequest<typeof SvelteSpa>({
      indexPath: asset(manifest, "SvelteSpaIndex"),
      pagePath: asset(manifest, "SvelteSpa"),
      props: { cssPath: sharedCssPath },
      request,
    });

  const vueHandler = ({ request }: { request: Request }) =>
    handleVuePageRequest<typeof VueSpa>({
      headTag: generateHeadElement({
        cssPath: sharedCssPath,
        title: "AbsoluteJS SPA — Vue",
      }),
      indexPath: asset(manifest, "VueSpaIndex"),
      pagePath: asset(manifest, "VueSpa"),
      props: { cssPath: sharedCssPath },
      request,
    });

  const vueI18nHandler = ({ request }: { request: Request }) =>
    handleVuePageRequest<typeof VueI18n>({
      headTag: generateHeadElement({
        cssPath: sharedCssPath,
        title: "AbsoluteJS SPA — Vue + i18n",
      }),
      indexPath: asset(manifest, "VueI18nIndex"),
      pagePath: asset(manifest, "VueI18n"),
      props: { cssPath: sharedCssPath },
      request,
    });

  const vuePiniaHandler = ({ request }: { request: Request }) =>
    handleVuePageRequest<typeof VuePinia>({
      headTag: generateHeadElement({
        cssPath: sharedCssPath,
        title: "AbsoluteJS SPA — Vue + pinia",
      }),
      indexPath: asset(manifest, "VuePiniaIndex"),
      pagePath: asset(manifest, "VuePinia"),
      props: { cssPath: sharedCssPath },
      request,
    });

  return new Elysia()
    .get("/", ({ redirect }) => redirect("/react", 302))
    .get("/react", reactHandler)
    .get("/react/*", reactHandler)
    .get("/svelte", svelteHandler)
    .get("/svelte/*", svelteHandler)
    .get("/vue", vueHandler)
    .get("/vue/*", vueHandler)
    .get("/vue-i18n", vueI18nHandler)
    .get("/vue-i18n/*", vueI18nHandler)
    .get("/vue-pinia", vuePiniaHandler)
    .get("/vue-pinia/*", vuePiniaHandler)
    // The Angular handler is inlined into both `.get` calls on purpose: the
    // build's AST scan walks up from each `handleAngularPageRequest` call to
    // its enclosing mount, and the `/angular/*` mount is what makes it infer
    // `APP_BASE_HREF: "/angular/"` and inject it alongside
    // `provideRouter(routes)` into the page's SSR bundle. Extracting the call
    // into a shared const would hide the mount from the scanner and break the
    // inferred base href, so each route keeps its own inline call.
    .get("/angular", ({ request }) =>
      handleAngularPageRequest<AngularSpaPage.Context>({
        headTag: generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS SPA — Angular",
        }),
        indexPath: asset(manifest, "AngularSpaIndex"),
        pagePath: asset(manifest, "AngularSpa"),
        request,
        requestContext: {},
      }),
    )
    .get("/angular/*", ({ request }) =>
      handleAngularPageRequest<AngularSpaPage.Context>({
        headTag: generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS SPA — Angular",
        }),
        indexPath: asset(manifest, "AngularSpaIndex"),
        pagePath: asset(manifest, "AngularSpa"),
        request,
        requestContext: {},
      }),
    );
};
