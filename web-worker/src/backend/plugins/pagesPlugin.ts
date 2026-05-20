import { Elysia } from "elysia";
import {
  handleReactPageRequest,
  handleHTMLPageRequest,
  generateHeadElement,
  asset,
} from "@absolutejs/absolute";
import { handleSveltePageRequest } from "@absolutejs/absolute/svelte";
import { handleVuePageRequest } from "@absolutejs/absolute/vue";
import { handleAngularPageRequest } from "@absolutejs/absolute/angular";
import { ReactWorkerDemo } from "../../frontend/react/pages/ReactWorkerDemo";

export const pagesPlugin = (manifest: Record<string, string>) =>
  new Elysia()
    .get("/", () =>
      handleReactPageRequest(
        ReactWorkerDemo,
        asset(manifest, "ReactWorkerDemoIndex"),
        {
          cssPath: asset(manifest, "WorkerDemoCSS"),
        },
      ),
    )
    .get("/svelte", async () => {
      const SvelteWorkerDemo = (
        await import("../../frontend/svelte/pages/SvelteWorkerDemo.svelte")
      ).default;

      return handleSveltePageRequest(
        SvelteWorkerDemo,
        asset(manifest, "SvelteWorkerDemo"),
        asset(manifest, "SvelteWorkerDemoIndex"),
        {
          cssPath: asset(manifest, "WorkerDemoCSS"),
        },
      );
    })
    .get("/vue", async () => {
      const { VueWorkerDemo } = (await import("../vueImporter")).vueImports;

      return handleVuePageRequest(
        VueWorkerDemo,
        asset(manifest, "VueWorkerDemo"),
        asset(manifest, "VueWorkerDemoIndex"),
        generateHeadElement({
          cssPath: asset(manifest, "WorkerDemoCSS"),
          title: "AbsoluteJS Web Workers - Vue",
        }),
      );
    })
    .get("/angular", async () =>
      handleAngularPageRequest(
        () => import("../../frontend/angular/pages/angular-worker-demo"),
        asset(manifest, "AngularWorkerDemo"),
        asset(manifest, "AngularWorkerDemoIndex"),
        generateHeadElement({
          cssPath: asset(manifest, "WorkerDemoCSS"),
          title: "AbsoluteJS Web Workers - Angular",
        }),
      ),
    )
    .get("/html", () =>
      handleHTMLPageRequest(asset(manifest, "HtmlWorkerDemo")),
    );
