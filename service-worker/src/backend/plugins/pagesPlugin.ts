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
import { ReactSwDemo } from "../../frontend/react/pages/ReactSwDemo";

export const pagesPlugin = (manifest: Record<string, string>) =>
  new Elysia()
    .get("/", () =>
      handleReactPageRequest(ReactSwDemo, asset(manifest, "ReactSwDemoIndex"), {
        cssPath: asset(manifest, "SwDemoCSS"),
      }),
    )
    .get("/svelte", async () => {
      const SvelteSwDemo = (
        await import("../../frontend/svelte/pages/SvelteSwDemo.svelte")
      ).default;

      return handleSveltePageRequest(
        SvelteSwDemo,
        asset(manifest, "SvelteSwDemo"),
        asset(manifest, "SvelteSwDemoIndex"),
        {
          cssPath: asset(manifest, "SwDemoCSS"),
        },
      );
    })
    .get("/vue", async () => {
      const { VueSwDemo } = (await import("../vueImporter")).vueImports;

      return handleVuePageRequest(
        VueSwDemo,
        asset(manifest, "VueSwDemo"),
        asset(manifest, "VueSwDemoIndex"),
        generateHeadElement({
          cssPath: asset(manifest, "SwDemoCSS"),
          title: "AbsoluteJS Service Workers - Vue",
        }),
      );
    })
    .get("/angular", async () =>
      handleAngularPageRequest(
        () => import("../../frontend/angular/pages/angular-sw-demo"),
        asset(manifest, "AngularSwDemo"),
        asset(manifest, "AngularSwDemoIndex"),
        generateHeadElement({
          cssPath: asset(manifest, "SwDemoCSS"),
          title: "AbsoluteJS Service Workers - Angular",
        }),
      ),
    )
    .get("/html", () => handleHTMLPageRequest(asset(manifest, "HtmlSwDemo")));
