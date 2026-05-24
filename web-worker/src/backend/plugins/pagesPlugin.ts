import { Elysia } from "elysia";
import {
  handleHTMLPageRequest,
  generateHeadElement,
  asset,
} from "@absolutejs/absolute";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { handleSveltePageRequest } from "@absolutejs/absolute/svelte";
import { handleVuePageRequest } from "@absolutejs/absolute/vue";
import { handleAngularPageRequest } from "@absolutejs/absolute/angular";
import type SvelteWorkerDemo from "../../frontend/svelte/pages/SvelteWorkerDemo.svelte";
import type VueWorkerDemo from "../../frontend/vue/pages/VueWorkerDemo.vue";
import type * as AngularWorkerDemoPage from "../../frontend/angular/pages/angular-worker-demo/angular-worker-demo";
import { ReactWorkerDemo } from "../../frontend/react/pages/ReactWorkerDemo";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const cssPath = asset(manifest, "WorkerDemoCSS");

  return new Elysia()
    .get("/", ({ request }) =>
      handleReactPageRequest({
        index: asset(manifest, "ReactWorkerDemoIndex"),
        Page: ReactWorkerDemo,
        props: { cssPath },
        request,
      }),
    )
    .get("/svelte", ({ request }) =>
      handleSveltePageRequest<typeof SvelteWorkerDemo>({
        indexPath: asset(manifest, "SvelteWorkerDemoIndex"),
        pagePath: asset(manifest, "SvelteWorkerDemo"),
        props: { cssPath },
        request,
      }),
    )
    .get("/vue", ({ request }) =>
      handleVuePageRequest<typeof VueWorkerDemo>({
        headTag: generateHeadElement({
          cssPath,
          title: "AbsoluteJS Web Workers - Vue",
        }),
        indexPath: asset(manifest, "VueWorkerDemoIndex"),
        pagePath: asset(manifest, "VueWorkerDemo"),
        request,
      }),
    )
    .get("/angular", ({ request }) =>
      handleAngularPageRequest<AngularWorkerDemoPage.Context>({
        headTag: generateHeadElement({
          cssPath,
          title: "AbsoluteJS Web Workers - Angular",
        }),
        indexPath: asset(manifest, "AngularWorkerDemoIndex"),
        pagePath: asset(manifest, "AngularWorkerDemo"),
        request,
        requestContext: {},
      }),
    )
    .get("/html", () =>
      handleHTMLPageRequest(asset(manifest, "HtmlWorkerDemo")),
    );
};
