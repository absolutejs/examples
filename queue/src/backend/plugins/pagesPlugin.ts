import type * as QueueAngularPage from "../../frontend/angular/pages/queue-angular-page/queue-angular-page";
import type QueueSveltePage from "../../frontend/svelte/pages/QueueSveltePage.svelte";
import type QueueVuePage from "../../frontend/vue/pages/QueueVuePage.vue";
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
import { QueueReactPage } from "../../frontend/react/pages/QueueReactPage";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const sharedCssPath = asset(manifest, "QueueCSS");

  return new Elysia()
    .get("/", ({ request }) =>
      handleReactPageRequest({
        index: asset(manifest, "QueueReactPageIndex"),
        Page: QueueReactPage,
        props: { cssPath: sharedCssPath },
        request,
      }),
    )
    .get("/vue", ({ request }) =>
      handleVuePageRequest<typeof QueueVuePage>({
        headTag: generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Queue - Vue",
        }),
        indexPath: asset(manifest, "QueueVuePageIndex"),
        pagePath: asset(manifest, "QueueVuePage"),
        request,
      }),
    )
    .get("/svelte", ({ request }) =>
      handleSveltePageRequest<typeof QueueSveltePage>({
        indexPath: asset(manifest, "QueueSveltePageIndex"),
        pagePath: asset(manifest, "QueueSveltePage"),
        props: { cssPath: sharedCssPath },
        request,
      }),
    )
    .get("/angular", ({ request }) =>
      handleAngularPageRequest<QueueAngularPage.Context>({
        headTag: generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Queue - Angular",
        }),
        indexPath: asset(manifest, "QueueAngularPageIndex"),
        pagePath: asset(manifest, "QueueAngularPage"),
        request,
        requestContext: {},
      }),
    )
    .get("/html", () => handleHTMLPageRequest(asset(manifest, "QueueHtmlPage")))
    .get("/htmx", () =>
      handleHTMXPageRequest(asset(manifest, "QueueHtmxPage")),
    );
};
