import { file } from "bun";
import { basename, dirname, join } from "node:path";
import { Elysia, status } from "elysia";
import type * as AngularRAGVectorDemoPage from "../../../frontend/angular/pages/angular-rag-vector-demo";
import type SvelteRAGVectorDemo from "../../../frontend/svelte/pages/SvelteRAGVectorDemo.svelte";
import type VueRAGVectorDemo from "../../../frontend/vue/pages/VueRAGVectorDemo.vue";
import {
  handleHTMLPageRequest,
  handleHTMXPageRequest,
  generateHeadElement,
  asset,
} from "@absolutejs/absolute";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { handleAngularPageRequest } from "@absolutejs/absolute/angular";
import { handleSveltePageRequest } from "@absolutejs/absolute/svelte";
import { handleVuePageRequest } from "@absolutejs/absolute/vue";
import { ReactRAGVectorDemo } from "../../../frontend/react/pages/ReactRAGVectorDemo";
import {
  getDemoUploadPreset,
  type DemoBackendDescriptor,
  type DemoBackendMode,
} from "../../../frontend/demo-backends";
import {
  demoBackendModeParamsTypebox,
  type DemoBackendModeParam,
} from "../../../types/typebox";

const DEFAULT_MODE: DemoBackendMode = "sqlite-native";

type PagesPluginOptions = {
  backends: DemoBackendDescriptor[];
};

const isBackendAvailable = (
  backends: DemoBackendDescriptor[],
  mode: DemoBackendModeParam,
) => backends.find((backend) => backend.id === mode)?.available === true;

const htmxPageAsset = (
  manifest: Record<string, string>,
  mode: DemoBackendModeParam,
) => {
  switch (mode) {
    case "sqlite-fallback":
      return asset(manifest, "HtmxRAGVectorDemoSqliteFallback");
    case "postgres":
      return asset(manifest, "HtmxRAGVectorDemoPostgres");
    case "pinecone":
      return asset(manifest, "HtmxRAGVectorDemoPinecone");
    case "sqlite-native":
    default:
      return asset(manifest, "HtmxRAGVectorDemoSqliteNative");
  }
};

const htmxRuntimeAsset = (manifest: Record<string, string>) =>
  join(
    dirname(asset(manifest, "HtmxRAGVectorDemoSqliteNative")),
    "..",
    "htmx.min.js",
  );

const htmlScriptAsset = (manifest: Record<string, string>) =>
  join(
    dirname(asset(manifest, "HtmlRAGVectorDemo")),
    "..",
    "scripts",
    basename(asset(manifest, "RagVectorDemo")),
  );

export const pagesPlugin = (
  manifest: Record<string, string>,
  options: PagesPluginOptions,
) =>
  new Elysia()
    .get("/", () =>
      handleReactPageRequest({
        Page: ReactRAGVectorDemo,
        index: asset(manifest, "ReactRAGVectorDemoIndex"),
        props: {
          availableBackends: options.backends,
          cssPath: asset(manifest, "RagVectorDemoCSS"),
          mode: DEFAULT_MODE,
        },
      }),
    )
    .get("/demo/backends", () => options.backends)
    .get("/demo/upload-fixtures/:id", ({ params }) => {
      const preset = getDemoUploadPreset(params.id);
      if (!preset) {
        return status(404, `Unknown upload fixture ${params.id}`);
      }

      return new Response(
        file(join(process.cwd(), "rag-demo-corpus", preset.fixturePath)),
        {
          headers: { "Content-Type": preset.contentType },
        },
      );
    })
    .get(
      "/htmx/htmx.min.js",
      () =>
        new Response(file(htmxRuntimeAsset(manifest)), {
          headers: { "Content-Type": "application/javascript; charset=utf-8" },
        }),
    )
    .get(
      "/html/scripts/rag-vector-demo.ts",
      () =>
        new Response(file(htmlScriptAsset(manifest)), {
          headers: { "Content-Type": "application/javascript; charset=utf-8" },
        }),
    )
    .get(
      "/react/:mode",
      ({ params }) => {
        if (!isBackendAvailable(options.backends, params.mode)) {
          return status(404, `Backend mode ${params.mode} is not available`);
        }

        return handleReactPageRequest({
          Page: ReactRAGVectorDemo,
          index: asset(manifest, "ReactRAGVectorDemoIndex"),
          props: {
            availableBackends: options.backends,
            cssPath: asset(manifest, "RagVectorDemoCSS"),
            mode: params.mode,
          },
        });
      },
      {
        params: demoBackendModeParamsTypebox,
      },
    )
    .get(
      "/svelte/:mode",
      ({ params }) => {
        if (!isBackendAvailable(options.backends, params.mode)) {
          return status(404, `Backend mode ${params.mode} is not available`);
        }

        return handleSveltePageRequest<typeof SvelteRAGVectorDemo>({
          indexPath: asset(manifest, "SvelteRAGVectorDemoIndex"),
          pagePath: asset(manifest, "SvelteRAGVectorDemo"),
          props: {
            availableBackends: options.backends,
            cssPath: asset(manifest, "RagVectorDemoCSS"),
            mode: params.mode,
          },
        });
      },
      {
        params: demoBackendModeParamsTypebox,
      },
    )
    .get(
      "/vue/:mode",
      ({ params }) => {
        if (!isBackendAvailable(options.backends, params.mode)) {
          return status(404, `Backend mode ${params.mode} is not available`);
        }

        return handleVuePageRequest<typeof VueRAGVectorDemo>({
          headTag: generateHeadElement({
            cssPath: asset(manifest, "RagVectorDemoCSS"),
            title: "AbsoluteJS RAG Workflow Demo - Vue",
          }),
          indexPath: asset(manifest, "VueRAGVectorDemoIndex"),
          pagePath: asset(manifest, "VueRAGVectorDemo"),
          props: {
            availableBackends: options.backends,
            mode: params.mode,
          },
        });
      },
      {
        params: demoBackendModeParamsTypebox,
      },
    )
    .get(
      "/html/:mode",
      ({ params }) => {
        if (!isBackendAvailable(options.backends, params.mode)) {
          return status(404, `Backend mode ${params.mode} is not available`);
        }

        return handleHTMLPageRequest(asset(manifest, "HtmlRAGVectorDemo"));
      },
      {
        params: demoBackendModeParamsTypebox,
      },
    )
    .get(
      "/htmx/:mode",
      ({ params }) => {
        if (!isBackendAvailable(options.backends, params.mode)) {
          return status(404, `Backend mode ${params.mode} is not available`);
        }

        const postgresAvailable = isBackendAvailable(
          options.backends,
          "postgres",
        );
        const pageAsset =
          !postgresAvailable && params.mode !== "postgres"
            ? params.mode === "sqlite-native"
              ? asset(manifest, "HtmxRAGVectorDemoSqliteNativeNoPostgres")
              : asset(manifest, "HtmxRAGVectorDemoSqliteFallbackNoPostgres")
            : htmxPageAsset(manifest, params.mode);

        return handleHTMXPageRequest(pageAsset);
      },
      {
        params: demoBackendModeParamsTypebox,
      },
    )
    .get(
      "/angular/:mode",
      ({ params }) => {
        if (!isBackendAvailable(options.backends, params.mode)) {
          return status(404, `Backend mode ${params.mode} is not available`);
        }

        return handleAngularPageRequest<typeof AngularRAGVectorDemoPage>({
          headTag: generateHeadElement({
            cssPath: asset(manifest, "RagVectorDemoCSS"),
            title: "AbsoluteJS RAG Workflow Demo - Angular",
          }),
          indexPath: asset(manifest, "AngularRagVectorDemoIndex"),
          pagePath: asset(manifest, "AngularRagVectorDemo"),
          props: {
            availableBackends: options.backends,
            mode: params.mode,
          },
        });
      },
      {
        params: demoBackendModeParamsTypebox,
      },
    );
