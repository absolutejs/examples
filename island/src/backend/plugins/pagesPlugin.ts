import type * as AngularHostPage from "../../frontend/angular/pages/angular-host/angular-host";
import type SvelteHost from "../../frontend/svelte/pages/SvelteHost.svelte";
import type VueHost from "../../frontend/vue/pages/VueHost.vue";
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
import { IslandsPage } from "../../frontend/react/pages/IslandsPage";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const sharedCssPath = asset(manifest, "IslandsCSS");

  return new Elysia()
    .get("/", ({ request }) =>
      handleReactPageRequest({
        index: asset(manifest, "IslandsPageIndex"),
        Page: IslandsPage,
        props: { cssPath: sharedCssPath },
        request,
      }),
    )
    .get("/vue", ({ request }) =>
      handleVuePageRequest<typeof VueHost>({
        headTag: generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Islands - Vue",
        }),
        indexPath: asset(manifest, "VueHostIndex"),
        pagePath: asset(manifest, "VueHost"),
        request,
      }),
    )
    .get("/svelte", ({ request }) =>
      handleSveltePageRequest<typeof SvelteHost>({
        indexPath: asset(manifest, "SvelteHostIndex"),
        pagePath: asset(manifest, "SvelteHost"),
        props: { cssPath: sharedCssPath },
        request,
      }),
    )
    .get("/angular", ({ request }) =>
      handleAngularPageRequest<AngularHostPage.Context>({
        headTag: generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Islands - Angular",
        }),
        indexPath: asset(manifest, "AngularHostIndex"),
        pagePath: asset(manifest, "AngularHost"),
        request,
        requestContext: {},
      }),
    )
    .get("/html", () => handleHTMLPageRequest(asset(manifest, "HTMLHost")))
    .get("/htmx", () => handleHTMXPageRequest(asset(manifest, "HTMXHost")));
};
