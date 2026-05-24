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
import { Elysia } from "elysia";
import type * as AngularImageDemoPage from "../../frontend/angular/pages/angular-image-demo/angular-image-demo";
import type SvelteImageDemo from "../../frontend/svelte/pages/SvelteImageDemo.svelte";
import type VueImageDemo from "../../frontend/vue/pages/VueImageDemo.vue";
import { ReactImageDemo } from "../../frontend/react/pages/ReactImageDemo";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const cssPath = asset(manifest, "ImageDemoCSS");

  return new Elysia()
    .get("/", ({ request }) =>
      handleReactPageRequest({
        index: asset(manifest, "ReactImageDemoIndex"),
        Page: ReactImageDemo,
        props: { cssPath },
        request,
      }),
    )
    .get("/svelte", ({ request }) =>
      handleSveltePageRequest<typeof SvelteImageDemo>({
        indexPath: asset(manifest, "SvelteImageDemoIndex"),
        pagePath: asset(manifest, "SvelteImageDemo"),
        props: { cssPath },
        request,
      }),
    )
    .get("/vue", ({ request }) =>
      handleVuePageRequest<typeof VueImageDemo>({
        headTag: generateHeadElement({
          cssPath,
          title: "AbsoluteJS Image Optimization - Vue",
        }),
        indexPath: asset(manifest, "VueImageDemoIndex"),
        pagePath: asset(manifest, "VueImageDemo"),
        props: { cssPath },
        request,
      }),
    )
    .get("/html", () => handleHTMLPageRequest(asset(manifest, "HtmlImageDemo")))
    .get("/htmx", () => handleHTMXPageRequest(asset(manifest, "HtmxImageDemo")))
    .get("/angular", ({ request }) =>
      handleAngularPageRequest<AngularImageDemoPage.Context>({
        headTag: generateHeadElement({
          cssPath,
          title: "AbsoluteJS Image Optimization - Angular",
        }),
        indexPath: asset(manifest, "AngularImageDemoIndex"),
        pagePath: asset(manifest, "AngularImageDemo"),
        request,
        requestContext: {},
      }),
    );
};
