import { Elysia } from "elysia";
import { asset, generateHeadElement } from "@absolutejs/absolute";
import { handleAngularPageRequest } from "@absolutejs/absolute/angular";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { handleSveltePageRequest } from "@absolutejs/absolute/svelte";
import { handleVuePageRequest } from "@absolutejs/absolute/vue";
import type * as AngularBrokenPage from "../../frontend/angular/pages/AngularBroken";
import type * as AngularHomePage from "../../frontend/angular/pages/AngularHome";
import type SvelteBroken from "../../frontend/svelte/pages/SvelteBroken.svelte";
import type SvelteHome from "../../frontend/svelte/pages/SvelteHome.svelte";
import type VueBroken from "../../frontend/vue/pages/VueBroken.vue";
import type VueHome from "../../frontend/vue/pages/VueHome.vue";
import { Landing } from "../../frontend/react/pages/Landing";
import { ReactBroken } from "../../frontend/react/pages/ReactBroken";
import { ReactHome } from "../../frontend/react/pages/ReactHome";

export const pagesPlugin = (manifest: Record<string, string>) =>
  new Elysia()
    .get("/", () =>
      handleReactPageRequest({
        Page: Landing,
        index: asset(manifest, "LandingIndex"),
        props: { cssPath: asset(manifest, "ErrorDemoCSS") },
      }),
    )
    .get("/react", () =>
      handleReactPageRequest({
        Page: ReactHome,
        index: asset(manifest, "ReactHomeIndex"),
        props: { cssPath: asset(manifest, "ErrorDemoCSS") },
      }),
    )
    .get("/broken-react", () =>
      handleReactPageRequest({
        Page: ReactBroken,
        index: asset(manifest, "ReactBrokenIndex"),
        props: { cssPath: asset(manifest, "ErrorDemoCSS") },
      }),
    )
    .get("/svelte", () =>
      handleSveltePageRequest<typeof SvelteHome>({
        indexPath: asset(manifest, "SvelteHomeIndex"),
        pagePath: asset(manifest, "SvelteHome"),
        props: { cssPath: asset(manifest, "ErrorDemoCSS") },
      }),
    )
    .get("/broken-svelte", () =>
      handleSveltePageRequest<typeof SvelteBroken>({
        indexPath: asset(manifest, "SvelteBrokenIndex"),
        pagePath: asset(manifest, "SvelteBroken"),
        props: { cssPath: asset(manifest, "ErrorDemoCSS") },
      }),
    )
    .get("/vue", () =>
      handleVuePageRequest<typeof VueHome>({
        headTag: generateHeadElement({
          cssPath: asset(manifest, "ErrorDemoCSS"),
          title: "AbsoluteJS Error Boundaries - Vue",
        }),
        indexPath: asset(manifest, "VueHomeIndex"),
        pagePath: asset(manifest, "VueHome"),
      }),
    )
    .get("/broken-vue", () =>
      handleVuePageRequest<typeof VueBroken>({
        headTag: generateHeadElement({
          cssPath: asset(manifest, "ErrorDemoCSS"),
          title: "AbsoluteJS Error Boundaries - Vue (Broken)",
        }),
        indexPath: asset(manifest, "VueBrokenIndex"),
        pagePath: asset(manifest, "VueBroken"),
      }),
    )
    .get("/angular", () =>
      handleAngularPageRequest<typeof AngularHomePage>({
        headTag: generateHeadElement({
          cssPath: asset(manifest, "ErrorDemoCSS"),
          title: "AbsoluteJS Error Boundaries - Angular",
        }),
        indexPath: asset(manifest, "AngularHomeIndex"),
        pagePath: asset(manifest, "AngularHome"),
      }),
    )
    .get("/broken-angular", () =>
      handleAngularPageRequest<typeof AngularBrokenPage>({
        headTag: generateHeadElement({
          cssPath: asset(manifest, "ErrorDemoCSS"),
          title: "AbsoluteJS Error Boundaries - Angular (Broken)",
        }),
        indexPath: asset(manifest, "AngularBrokenIndex"),
        pagePath: asset(manifest, "AngularBroken"),
      }),
    );
