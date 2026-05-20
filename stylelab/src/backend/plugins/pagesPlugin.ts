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
import { Elysia } from "elysia";
import { ReactStylesPage } from "../../frontend/react/pages/ReactStylesPage";
import type SvelteStylesPage from "../../frontend/svelte/pages/SvelteStylesPage.svelte";
import type VueStylesPage from "../../frontend/vue/pages/VueStylesPage.vue";

const styleAssets = {
  less: "LessPageCSS",
  scss: "ScssPageCSS",
  stylus: "StylusPageCSS",
} as const;

type PreprocessorStyleKind = keyof typeof styleAssets;
type StyleKind = PreprocessorStyleKind | "tailwind";

const styleTitle = {
  less: "Less",
  scss: "SCSS",
  stylus: "Stylus",
  tailwind: "Tailwind",
} as const;

const getStyleCssPath = (manifest: Record<string, string>, style: StyleKind) =>
  style === "tailwind" ? "/tailwind.css" : asset(manifest, styleAssets[style]);

const renderReactStylePage = (
  manifest: Record<string, string>,
  style: StyleKind,
) =>
  handleReactPageRequest({
    index: asset(manifest, "ReactStylesPageIndex"),
    Page: ReactStylesPage,
    props: {
      cssPath: getStyleCssPath(manifest, style),
      style,
    },
  });

const renderSvelteStylePage = (
  manifest: Record<string, string>,
  style: StyleKind,
) =>
  handleSveltePageRequest<typeof SvelteStylesPage>({
    indexPath: asset(manifest, "SvelteStylesPageIndex"),
    pagePath: asset(manifest, "SvelteStylesPage"),
    props: {
      cssPath: getStyleCssPath(manifest, style),
      style,
    },
  });

const renderVueStylePage = (
  manifest: Record<string, string>,
  style: StyleKind,
) =>
  handleVuePageRequest<typeof VueStylesPage>({
    headTag: generateHeadElement({
      cssPath: [
        getStyleCssPath(manifest, style),
        asset(manifest, "VueStylesPageBundledCSS"),
      ],
      title: `AbsoluteJS StyleLab - Vue ${styleTitle[style]}`,
    }),
    indexPath: asset(manifest, "VueStylesPageIndex"),
    pagePath: asset(manifest, "VueStylesPage"),
    props: { style },
  });

const renderAngularPage = (
  manifest: Record<string, string>,
  title: string,
  pageKey: string,
  cssPath?: string,
) =>
  handleAngularPageRequest({
    headTag: generateHeadElement({
      cssPath,
      title,
    }),
    indexPath: asset(manifest, `${pageKey}Index`),
    pagePath: asset(manifest, pageKey),
  });

export const pagesPlugin = (manifest: Record<string, string>) =>
  new Elysia()
    .get("/", ({ redirect }) => redirect("/react/tailwind"))
    .get("/react/scss", () => renderReactStylePage(manifest, "scss"))
    .get("/react/less", () => renderReactStylePage(manifest, "less"))
    .get("/react/stylus", () => renderReactStylePage(manifest, "stylus"))
    .get("/react/tailwind", () => renderReactStylePage(manifest, "tailwind"))
    .get("/svelte/scss", () => renderSvelteStylePage(manifest, "scss"))
    .get("/svelte/less", () => renderSvelteStylePage(manifest, "less"))
    .get("/svelte/stylus", () => renderSvelteStylePage(manifest, "stylus"))
    .get("/svelte/tailwind", () => renderSvelteStylePage(manifest, "tailwind"))
    .get("/vue/scss", () => renderVueStylePage(manifest, "scss"))
    .get("/vue/less", () => renderVueStylePage(manifest, "less"))
    .get("/vue/stylus", () => renderVueStylePage(manifest, "stylus"))
    .get("/vue/tailwind", () => renderVueStylePage(manifest, "tailwind"))
    .get("/angular/scss", () =>
      renderAngularPage(
        manifest,
        "AbsoluteJS StyleLab - Angular SCSS",
        "AngularScssPage",
        getStyleCssPath(manifest, "scss"),
      ),
    )
    .get("/angular/less", () =>
      renderAngularPage(
        manifest,
        "AbsoluteJS StyleLab - Angular Less",
        "AngularLessPage",
        getStyleCssPath(manifest, "less"),
      ),
    )
    .get("/angular/stylus", () =>
      renderAngularPage(
        manifest,
        "AbsoluteJS StyleLab - Angular Stylus",
        "AngularStylusPage",
        getStyleCssPath(manifest, "stylus"),
      ),
    )
    .get("/angular/tailwind", () =>
      renderAngularPage(
        manifest,
        "AbsoluteJS StyleLab - Angular Tailwind",
        "AngularTailwindPage",
        getStyleCssPath(manifest, "tailwind"),
      ),
    )
    .get("/html/scss", () =>
      handleHTMLPageRequest(asset(manifest, "HTMLStyles")),
    )
    .get("/html/less", () =>
      handleHTMLPageRequest(asset(manifest, "LessStyles")),
    )
    .get("/html/stylus", () =>
      handleHTMLPageRequest(asset(manifest, "StylusStyles")),
    )
    .get("/html/tailwind", () =>
      handleHTMLPageRequest(asset(manifest, "HTMLTailwind")),
    )
    .get("/htmx/scss", () =>
      handleHTMXPageRequest(asset(manifest, "HtmxScssStyles")),
    )
    .get("/htmx/less", () =>
      handleHTMXPageRequest(asset(manifest, "HtmxLessStyles")),
    )
    .get("/htmx/stylus", () =>
      handleHTMXPageRequest(asset(manifest, "HTMXStyles")),
    )
    .get("/htmx/tailwind", () =>
      handleHTMXPageRequest(asset(manifest, "HtmxTailwind")),
    );
