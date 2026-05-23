import { Elysia } from "elysia";
import {
  handleHTMLPageRequest,
  handleHTMXPageRequest,
  generateHeadElement,
  asset,
} from "@absolutejs/absolute";
import { handleAngularPageRequest } from "@absolutejs/absolute/angular";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { handleSveltePageRequest } from "@absolutejs/absolute/svelte";
import { handleVuePageRequest } from "@absolutejs/absolute/vue";
import type * as AngularChatPage from "../../frontend/angular/pages/angular-chat";
import type SvelteChat from "../../frontend/svelte/pages/SvelteChat.svelte";
import type VueChat from "../../frontend/vue/pages/VueChat.vue";
import { ReactChat } from "../../frontend/react/pages/ReactChat";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const cssPath = asset(manifest, "ChatCSS");

  return new Elysia()
    .get("/", ({ request }) =>
      handleReactPageRequest({
        index: asset(manifest, "ReactChatIndex"),
        Page: ReactChat,
        props: { cssPath },
        request,
      }),
    )
    .get("/svelte", ({ request }) =>
      handleSveltePageRequest<typeof SvelteChat>({
        indexPath: asset(manifest, "SvelteChatIndex"),
        pagePath: asset(manifest, "SvelteChat"),
        props: { cssPath },
        request,
      }),
    )
    .get("/vue", ({ request }) =>
      handleVuePageRequest<typeof VueChat>({
        headTag: generateHeadElement({
          cssPath,
          title: "AbsoluteJS AI Chat - Vue",
        }),
        indexPath: asset(manifest, "VueChatIndex"),
        pagePath: asset(manifest, "VueChat"),
        request,
      }),
    )
    .get("/html", () => handleHTMLPageRequest(asset(manifest, "HtmlChat")))
    .get("/htmx", () => handleHTMXPageRequest(asset(manifest, "HtmxChat")))
    .get("/angular", ({ request }) =>
      handleAngularPageRequest<AngularChatPage.Context>({
        headTag: generateHeadElement({
          cssPath,
          title: "AbsoluteJS AI Chat - Angular",
        }),
        indexPath: asset(manifest, "AngularChatIndex"),
        pagePath: asset(manifest, "AngularChat"),
        request,
        requestContext: {},
      }),
    );
};
