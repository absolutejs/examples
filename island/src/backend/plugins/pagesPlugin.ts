import { Elysia } from "elysia";
import {
  asset,
  generateHeadElement,
  handleHTMLPageRequest,
  handleHTMXPageRequest,
  handleReactPageRequest,
} from "@absolutejs/absolute";
import { handleAngularPageRequest } from "@absolutejs/absolute/angular";
import { handleSveltePageRequest } from "@absolutejs/absolute/svelte";
import { handleVuePageRequest } from "@absolutejs/absolute/vue";
import { IslandsPage } from "../../frontend/react/pages/IslandsPage";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const sharedCssPath = asset(manifest, "IslandsCSS");

  return new Elysia()
    .get("/", () =>
      handleReactPageRequest(IslandsPage, asset(manifest, "IslandsPageIndex"), {
        cssPath: sharedCssPath,
      }),
    )
    .get("/vue", async () => {
      const { VueHost } = (await import("../vueImporter")).vueImports;

      return handleVuePageRequest(
        VueHost,
        asset(manifest, "VueHost"),
        asset(manifest, "VueHostIndex"),
        generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Islands - Vue",
        }),
      );
    })
    .get("/svelte", async () => {
      const SvelteHost = (
        await import("../../frontend/svelte/pages/SvelteHost.svelte")
      ).default;

      return handleSveltePageRequest(
        SvelteHost,
        asset(manifest, "SvelteHost"),
        asset(manifest, "SvelteHostIndex"),
        {
          cssPath: sharedCssPath,
        },
      );
    })
    .get("/angular", async () =>
      handleAngularPageRequest(
        () => import("../../frontend/angular/pages/angular-host"),
        asset(manifest, "AngularHost"),
        asset(manifest, "AngularHostIndex"),
        generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Islands - Angular",
        }),
      ),
    )
    .get("/html", async () =>
      handleHTMLPageRequest(asset(manifest, "HTMLHost")),
    )
    .get("/htmx", async () =>
      handleHTMXPageRequest(asset(manifest, "HTMXHost")),
    );
};
