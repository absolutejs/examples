import { file } from "bun";
import { join } from "node:path";
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
import { ReactVoiceDemo } from "../../frontend/react/pages/ReactVoiceDemo";
import type * as AngularVoiceDemoPage from "../../frontend/angular/pages/angular-voice-demo";
import type SvelteVoiceDemo from "../../frontend/svelte/pages/SvelteVoiceDemo.svelte";
import type VueVoiceDemo from "../../frontend/vue/pages/VueVoiceDemo.vue";
import {
  FRAMEWORKS,
  isVoiceModelProvider,
  isVoiceProfileId,
  isVoiceRoutingMode,
  isVoiceSpeechEngine,
  type VoiceModelProvider,
  type VoiceProfileId,
  type VoiceRoutingMode,
  type VoiceSpeechEngine,
} from "../../shared/demo";

type VoiceDemoSelectionProps = {
  initialModelProvider: VoiceModelProvider;
  initialProfileId: VoiceProfileId;
  initialRoutingMode: VoiceRoutingMode;
  initialSpeechEngine: VoiceSpeechEngine;
};

const resolveVoiceDemoSelectionProps = (
  query: Record<string, unknown>,
): VoiceDemoSelectionProps => {
  const profileId = query.voiceProfile ?? query.profileId ?? query.callProfile;

  return {
    initialModelProvider: isVoiceModelProvider(query.provider)
      ? query.provider
      : "deterministic",
    initialProfileId: isVoiceProfileId(profileId)
      ? profileId
      : "meeting-recorder",
    initialRoutingMode: isVoiceRoutingMode(query.routing)
      ? query.routing
      : "balanced",
    initialSpeechEngine: isVoiceSpeechEngine(query.engine)
      ? query.engine
      : "cascaded",
  };
};

export const pagesPlugin = (manifest: Record<string, string>) =>
  new Elysia()
    .get("/", ({ redirect }) => redirect("/react"))
    .get(
      "/assets/png/absolutejs-temp.png",
      () =>
        new Response(
          file(
            join(
              process.cwd(),
              "src",
              "backend",
              "assets",
              "png",
              "absolutejs-temp.png",
            ),
          ),
          {
            headers: {
              "Content-Type": "image/png",
            },
          },
        ),
    )
    .get(
      "/assets/ico/favicon.ico",
      () =>
        new Response(
          file(
            join(
              process.cwd(),
              "src",
              "backend",
              "assets",
              "ico",
              "favicon.ico",
            ),
          ),
          {
            headers: {
              "Content-Type": "image/x-icon",
            },
          },
        ),
    )
    .get(
      "/favicon.ico",
      () =>
        new Response(
          file(
            join(
              process.cwd(),
              "src",
              "backend",
              "assets",
              "ico",
              "favicon.ico",
            ),
          ),
          {
            headers: {
              "Content-Type": "image/x-icon",
            },
          },
        ),
    )
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
    .get("/react", ({ query }) =>
      handleReactPageRequest({
        Page: ReactVoiceDemo,
        index: asset(manifest, "ReactVoiceDemoIndex"),
        props: {
          cssPath: asset(manifest, "VoiceDemoCSS"),
          ...resolveVoiceDemoSelectionProps(query),
        },
      }),
    )
    .get("/svelte", async ({ query }) => {
      return handleSveltePageRequest<typeof SvelteVoiceDemo>({
        pagePath: asset(manifest, "SvelteVoiceDemo"),
        indexPath: asset(manifest, "SvelteVoiceDemoIndex"),
        props: {
          cssPath: asset(manifest, "VoiceDemoCSS"),
          ...resolveVoiceDemoSelectionProps(query),
        },
      });
    })
    .get("/vue", async ({ query }) => {
      return handleVuePageRequest<typeof VueVoiceDemo>({
        pagePath: asset(manifest, "VueVoiceDemo"),
        indexPath: asset(manifest, "VueVoiceDemoIndex"),
        props: resolveVoiceDemoSelectionProps(query),
        headTag: generateHeadElement({
          cssPath: asset(manifest, "VoiceDemoCSS"),
          title: "AbsoluteJS Voice Intake - Vue",
        }),
      });
    })
    .get("/html", () => handleHTMLPageRequest(asset(manifest, "HtmlVoiceDemo")))
    .get("/htmx", () => handleHTMXPageRequest(asset(manifest, "HtmxVoiceDemo")))
    .get("/angular", async ({ query }) =>
      handleAngularPageRequest<AngularVoiceDemoPage.Context>({
        pagePath: asset(manifest, "AngularVoiceDemo"),
        indexPath: asset(manifest, "AngularVoiceDemoIndex"),
        requestContext: resolveVoiceDemoSelectionProps(query),
        headTag: generateHeadElement({
          cssPath: asset(manifest, "VoiceDemoCSS"),
          title: "AbsoluteJS Voice Intake - Angular",
        }),
      }),
    );
