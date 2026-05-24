import type * as SyncAngularPage from "../../frontend/angular/pages/sync-angular-page/sync-angular-page";
import type SyncSveltePage from "../../frontend/svelte/pages/SyncSveltePage.svelte";
import type SyncVuePage from "../../frontend/vue/pages/SyncVuePage.vue";
import { Elysia } from "elysia";
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
import { SyncReactPage } from "../../frontend/react/pages/SyncReactPage";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const sharedCssPath = asset(manifest, "SyncCSS");

  return new Elysia()
    .get("/", ({ request }) =>
      handleReactPageRequest({
        index: asset(manifest, "SyncReactPageIndex"),
        Page: SyncReactPage,
        props: { cssPath: sharedCssPath },
        request,
      }),
    )
    .get("/vue", ({ request }) =>
      handleVuePageRequest<typeof SyncVuePage>({
        headTag: generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Sync - Vue",
        }),
        indexPath: asset(manifest, "SyncVuePageIndex"),
        pagePath: asset(manifest, "SyncVuePage"),
        request,
      }),
    )
    .get("/svelte", ({ request }) =>
      handleSveltePageRequest<typeof SyncSveltePage>({
        indexPath: asset(manifest, "SyncSveltePageIndex"),
        pagePath: asset(manifest, "SyncSveltePage"),
        props: { cssPath: sharedCssPath },
        request,
      }),
    )
    .get("/angular", ({ request }) =>
      handleAngularPageRequest<SyncAngularPage.Context>({
        headTag: generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Sync - Angular",
        }),
        indexPath: asset(manifest, "SyncAngularPageIndex"),
        pagePath: asset(manifest, "SyncAngularPage"),
        request,
        requestContext: {},
      }),
    )
    .get("/html", () => handleHTMLPageRequest(asset(manifest, "SyncHtmlPage")))
    .get("/htmx", () => handleHTMXPageRequest(asset(manifest, "SyncHtmxPage")));
};
