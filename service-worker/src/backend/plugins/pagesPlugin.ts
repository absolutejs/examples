import type * as AngularSwDemoPage from "../../frontend/angular/pages/angular-sw-demo/angular-sw-demo";
import type SvelteSwDemo from "../../frontend/svelte/pages/SvelteSwDemo.svelte";
import type VueSwDemo from "../../frontend/vue/pages/VueSwDemo.vue";
import { Elysia } from "elysia";
import {
  asset,
  generateHeadElement,
  handleHTMLPageRequest,
} from "@absolutejs/absolute";
import { handleAngularPageRequest } from "@absolutejs/absolute/angular";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { handleSveltePageRequest } from "@absolutejs/absolute/svelte";
import { handleVuePageRequest } from "@absolutejs/absolute/vue";
import { ReactSwDemo } from "../../frontend/react/pages/ReactSwDemo";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const sharedCssPath = asset(manifest, "SwDemoCSS");

  const reactHandler = ({ request }: { request: Request }) =>
    handleReactPageRequest({
      index: asset(manifest, "ReactSwDemoIndex"),
      Page: ReactSwDemo,
      props: { cssPath: sharedCssPath },
      request,
    });

  const svelteHandler = ({ request }: { request: Request }) =>
    handleSveltePageRequest<typeof SvelteSwDemo>({
      indexPath: asset(manifest, "SvelteSwDemoIndex"),
      pagePath: asset(manifest, "SvelteSwDemo"),
      props: { cssPath: sharedCssPath },
      request,
    });

  const vueHandler = ({ request }: { request: Request }) =>
    handleVuePageRequest<typeof VueSwDemo>({
      headTag: generateHeadElement({
        cssPath: sharedCssPath,
        title: "AbsoluteJS Service Workers - Vue",
      }),
      indexPath: asset(manifest, "VueSwDemoIndex"),
      pagePath: asset(manifest, "VueSwDemo"),
      request,
    });

  return new Elysia()
    .get("/", reactHandler)
    .get("/svelte", svelteHandler)
    .get("/vue", vueHandler)
    .get("/angular", ({ request }) =>
      handleAngularPageRequest<AngularSwDemoPage.Context>({
        headTag: generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Service Workers - Angular",
        }),
        indexPath: asset(manifest, "AngularSwDemoIndex"),
        pagePath: asset(manifest, "AngularSwDemo"),
        request,
        requestContext: {},
      }),
    )
    .get("/html", () => handleHTMLPageRequest(asset(manifest, "HtmlSwDemo")));
};
