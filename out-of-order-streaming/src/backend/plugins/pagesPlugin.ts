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
import type * as AngularDeferHostPage from "../../frontend/angular/pages/angular-defer-host";
import type * as AngularStreamingHostPage from "../../frontend/angular/pages/angular-streaming-host";
import { ReactNativePage } from "../../frontend/react/pages/ReactNativePage";
import { ReactStreamingPage } from "../../frontend/react/pages/ReactStreamingPage";
import type SvelteAwaitHost from "../../frontend/svelte/pages/SvelteAwaitHost.svelte";
import type SvelteStreamingHost from "../../frontend/svelte/pages/SvelteStreamingHost.svelte";
import type VueStreamingPage from "../../frontend/vue/pages/VueStreamingPage.vue";
import type VueSuspensePage from "../../frontend/vue/pages/VueSuspensePage.vue";
import { htmlStreamingSlots } from "../handlers/htmlStreaming";
import { resolveHTMXSlotFragment } from "../handlers/htmxStreaming";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const sharedCssPath = asset(manifest, "StreamingCSS");

  const reactStreamingHandler = ({ request }: { request: Request }) =>
    handleReactPageRequest({
      Page: ReactStreamingPage,
      collectStreamingSlots: true,
      index: asset(manifest, "ReactStreamingPageIndex"),
      props: { cssPath: sharedCssPath },
      request,
    });

  const reactFrameworkHandler = ({ request }: { request: Request }) =>
    handleReactPageRequest({
      Page: ReactNativePage,
      collectStreamingSlots: true,
      index: asset(manifest, "ReactNativePageIndex"),
      props: { cssPath: sharedCssPath },
      request,
    });

  const vueStreamingHandler = ({ request }: { request: Request }) =>
    handleVuePageRequest<typeof VueStreamingPage>({
      collectStreamingSlots: true,
      headTag: generateHeadElement({
        cssPath: sharedCssPath,
        title: "AbsoluteJS Streaming - Vue Raw Slots",
      }),
      indexPath: asset(manifest, "VueStreamingPageIndex"),
      pagePath: asset(manifest, "VueStreamingPage"),
      request,
    });

  const vueFrameworkHandler = ({ request }: { request: Request }) =>
    handleVuePageRequest<typeof VueSuspensePage>({
      collectStreamingSlots: true,
      headTag: generateHeadElement({
        cssPath: sharedCssPath,
        title: "AbsoluteJS Streaming - Vue Framework Primitives",
      }),
      indexPath: asset(manifest, "VueSuspensePageIndex"),
      pagePath: asset(manifest, "VueSuspensePage"),
      request,
    });

  const svelteStreamingHandler = ({ request }: { request: Request }) =>
    handleSveltePageRequest<typeof SvelteStreamingHost>({
      collectStreamingSlots: true,
      indexPath: asset(manifest, "SvelteStreamingHostIndex"),
      pagePath: asset(manifest, "SvelteStreamingHost"),
      props: { cssPath: sharedCssPath },
      request,
    });

  const svelteFrameworkHandler = ({ request }: { request: Request }) =>
    handleSveltePageRequest<typeof SvelteAwaitHost>({
      collectStreamingSlots: true,
      indexPath: asset(manifest, "SvelteAwaitHostIndex"),
      pagePath: asset(manifest, "SvelteAwaitHost"),
      props: { cssPath: sharedCssPath },
      request,
    });

  return (
    new Elysia()
      .get("/", reactStreamingHandler)
      .get("/react-streaming", reactStreamingHandler)
      .get("/react-framework", reactFrameworkHandler)
      .get("/vue", vueStreamingHandler)
      .get("/vue-streaming", vueStreamingHandler)
      .get("/vue-framework", vueFrameworkHandler)
      .get("/svelte", svelteStreamingHandler)
      .get("/svelte-streaming", svelteStreamingHandler)
      .get("/svelte-framework", svelteFrameworkHandler)
      // The Angular handler is inlined into both `.get` calls on purpose: the
      // build's AST scan walks up from each `handleAngularPageRequest` call to
      // its enclosing mount, and the mount is what makes it infer the
      // `APP_BASE_HREF` and inject it alongside the page's SSR bundle.
      // Extracting the call into a shared const would hide the mount from the
      // scanner and break the inferred base href, so each route keeps its own
      // inline call.
      .get("/angular", ({ request }) =>
        handleAngularPageRequest<AngularStreamingHostPage.Context>({
          collectStreamingSlots: true,
          headTag: generateHeadElement({
            cssPath: sharedCssPath,
            title: "AbsoluteJS Streaming - Angular Raw Slots",
          }),
          indexPath: asset(manifest, "AngularStreamingHostIndex"),
          pagePath: asset(manifest, "AngularStreamingHost"),
          request,
          requestContext: {},
        }),
      )
      .get("/angular-streaming", ({ request }) =>
        handleAngularPageRequest<AngularStreamingHostPage.Context>({
          collectStreamingSlots: true,
          headTag: generateHeadElement({
            cssPath: sharedCssPath,
            title: "AbsoluteJS Streaming - Angular Raw Slots",
          }),
          indexPath: asset(manifest, "AngularStreamingHostIndex"),
          pagePath: asset(manifest, "AngularStreamingHost"),
          request,
          requestContext: {},
        }),
      )
      .get("/angular-framework", ({ request }) =>
        handleAngularPageRequest<AngularDeferHostPage.Context>({
          collectStreamingSlots: true,
          headTag: generateHeadElement({
            cssPath: sharedCssPath,
            title: "AbsoluteJS Streaming - Angular Framework Primitives",
          }),
          indexPath: asset(manifest, "AngularDeferHostIndex"),
          pagePath: asset(manifest, "AngularDeferHost"),
          request,
          requestContext: {},
        }),
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
      )
  );
};
