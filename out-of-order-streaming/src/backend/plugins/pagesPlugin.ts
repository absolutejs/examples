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
import { ReactNativePage } from "../../frontend/react/pages/ReactNativePage";
import { ReactStreamingPage } from "../../frontend/react/pages/ReactStreamingPage";
import { htmlStreamingSlots } from "../handlers/htmlStreaming";
import { resolveHTMXSlotFragment } from "../handlers/htmxStreaming";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const sharedCssPath = asset(manifest, "StreamingCSS");

  return new Elysia()
    .get("/", () =>
      handleReactPageRequest(
        ReactStreamingPage,
        asset(manifest, "ReactStreamingPageIndex"),
        {
          cssPath: sharedCssPath,
        },
        {
          collectStreamingSlots: true,
        },
      ),
    )
    .get("/react-streaming", () =>
      handleReactPageRequest(
        ReactStreamingPage,
        asset(manifest, "ReactStreamingPageIndex"),
        {
          cssPath: sharedCssPath,
        },
        {
          collectStreamingSlots: true,
        },
      ),
    )
    .get("/react-framework", () =>
      handleReactPageRequest(
        ReactNativePage,
        asset(manifest, "ReactNativePageIndex"),
        {
          cssPath: sharedCssPath,
        },
        {
          collectStreamingSlots: true,
        },
      ),
    )
    .get("/vue", async () => {
      const { VueStreamingPage } = (await import("../vueImporter")).vueImports;

      return handleVuePageRequest(
        VueStreamingPage,
        asset(manifest, "VueStreamingPage"),
        asset(manifest, "VueStreamingPageIndex"),
        generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Streaming - Vue Raw Slots",
        }),
        undefined,
        {
          collectStreamingSlots: true,
        },
      );
    })
    .get("/vue-streaming", async () => {
      const { VueStreamingPage } = (await import("../vueImporter")).vueImports;

      return handleVuePageRequest(
        VueStreamingPage,
        asset(manifest, "VueStreamingPage"),
        asset(manifest, "VueStreamingPageIndex"),
        generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Streaming - Vue Raw Slots",
        }),
        undefined,
        {
          collectStreamingSlots: true,
        },
      );
    })
    .get("/vue-framework", async () => {
      const { VueSuspensePage } = (await import("../vueImporter")).vueImports;

      return handleVuePageRequest(
        VueSuspensePage,
        asset(manifest, "VueSuspensePage"),
        asset(manifest, "VueSuspensePageIndex"),
        generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Streaming - Vue Framework Primitives",
        }),
        undefined,
        {
          collectStreamingSlots: true,
        },
      );
    })
    .get("/svelte", async () => {
      const SvelteStreamingHost = (
        await import("../../frontend/svelte/pages/SvelteStreamingHost.svelte")
      ).default;

      return handleSveltePageRequest(
        SvelteStreamingHost,
        asset(manifest, "SvelteStreamingHost"),
        asset(manifest, "SvelteStreamingHostIndex"),
        {
          cssPath: sharedCssPath,
        },
        {
          collectStreamingSlots: true,
        },
      );
    })
    .get("/svelte-streaming", async () => {
      const SvelteStreamingHost = (
        await import("../../frontend/svelte/pages/SvelteStreamingHost.svelte")
      ).default;

      return handleSveltePageRequest(
        SvelteStreamingHost,
        asset(manifest, "SvelteStreamingHost"),
        asset(manifest, "SvelteStreamingHostIndex"),
        {
          cssPath: sharedCssPath,
        },
        {
          collectStreamingSlots: true,
        },
      );
    })
    .get("/svelte-framework", async () => {
      const SvelteAwaitHost = (
        await import("../../frontend/svelte/pages/SvelteAwaitHost.svelte")
      ).default;

      return handleSveltePageRequest(
        SvelteAwaitHost,
        asset(manifest, "SvelteAwaitHost"),
        asset(manifest, "SvelteAwaitHostIndex"),
        {
          cssPath: sharedCssPath,
        },
        {
          collectStreamingSlots: true,
        },
      );
    })
    .get("/angular", async () =>
      handleAngularPageRequest(
        () => import("../../frontend/angular/pages/angular-streaming-host"),
        asset(manifest, "AngularStreamingHost"),
        asset(manifest, "AngularStreamingHostIndex"),
        generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Streaming - Angular Raw Slots",
        }),
        undefined,
        {
          collectStreamingSlots: true,
        },
      ),
    )
    .get("/angular-streaming", async () =>
      handleAngularPageRequest(
        () => import("../../frontend/angular/pages/angular-streaming-host"),
        asset(manifest, "AngularStreamingHost"),
        asset(manifest, "AngularStreamingHostIndex"),
        generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Streaming - Angular Raw Slots",
        }),
        undefined,
        {
          collectStreamingSlots: true,
        },
      ),
    )
    .get("/angular-framework", async () =>
      handleAngularPageRequest(
        () => import("../../frontend/angular/pages/angular-defer-host"),
        asset(manifest, "AngularDeferHost"),
        asset(manifest, "AngularDeferHostIndex"),
        generateHeadElement({
          cssPath: sharedCssPath,
          title: "AbsoluteJS Streaming - Angular Framework Primitives",
        }),
        undefined,
        {
          collectStreamingSlots: true,
        },
      ),
    )
    .get("/html", async () =>
      handleHTMLPageRequest(asset(manifest, "HTMLHost"), {
        streamingSlots: htmlStreamingSlots,
      }),
    )
    .get("/htmx/slots/:slotId", async ({ params }) => {
      const html = await resolveHTMXSlotFragment(params.slotId);
      if (!html) {
        return new Response("Not found", { status: 404 });
      }

      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    })
    .get("/htmx", async () =>
      handleHTMXPageRequest(asset(manifest, "HTMXHost")),
    );
};
