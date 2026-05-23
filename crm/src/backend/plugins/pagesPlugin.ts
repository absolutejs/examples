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
import { join } from "node:path";
import { file } from "bun";
import { ReactCRMDemo } from "../../frontend/react/pages/ReactCRMDemo";
import type SvelteCRMDemo from "../../frontend/svelte/pages/SvelteCRMDemo.svelte";
import type VueCRMDemo from "../../frontend/vue/pages/VueCRMDemo.vue";
import { FRAMEWORKS } from "../../shared/demo";

export const pagesPlugin = (manifest: Record<string, string>) =>
  new Elysia()
    .get("/", ({ redirect }) => redirect("/react"))
    .get("/demo/frameworks", () => FRAMEWORKS)
    .get(
      "/htmx/htmx.min.js",
      () =>
        new Response(
          file(
            join(
              process.cwd(),
              "node_modules",
              "htmx.org",
              "dist",
              "htmx.min.js",
            ),
          ),
          {
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
            },
          },
        ),
    )
    .get("/react", () =>
      handleReactPageRequest({
        index: asset(manifest, "ReactCRMDemoIndex"),
        Page: ReactCRMDemo,
        props: {
          cssPath: asset(manifest, "CrmDemoCSS"),
        },
      }),
    )
    .get("/svelte", async () =>
      handleSveltePageRequest<typeof SvelteCRMDemo>({
        indexPath: asset(manifest, "SvelteCRMDemoIndex"),
        pagePath: asset(manifest, "SvelteCRMDemo"),
        props: {
          cssPath: asset(manifest, "CrmDemoCSS"),
        },
      }),
    )
    .get("/vue", async () =>
      handleVuePageRequest<typeof VueCRMDemo>({
        headTag: generateHeadElement({
          cssPath: asset(manifest, "CrmDemoCSS"),
          title: "AbsoluteJS CRM Example — Vue",
        }),
        indexPath: asset(manifest, "VueCRMDemoIndex"),
        pagePath: asset(manifest, "VueCRMDemo"),
        props: {},
      }),
    )
    .get("/html", () => handleHTMLPageRequest(asset(manifest, "HtmlCRMDemo")))
    .get("/htmx", () => handleHTMXPageRequest(asset(manifest, "HtmxCRMDemo")))
    .get("/angular", async () =>
      handleAngularPageRequest({
        headTag: generateHeadElement({
          cssPath: asset(manifest, "CrmDemoCSS"),
          title: "AbsoluteJS CRM Example — Angular",
        }),
        indexPath: asset(manifest, "AngularCrmDemoIndex"),
        pagePath: asset(manifest, "AngularCrmDemo"),
      }),
    );
