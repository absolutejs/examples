import { networking, prepare } from "@absolutejs/absolute";
import { voice } from "@absolutejs/voice";
import { sync } from "@absolutejs/sync";

import { Elysia } from "elysia";

import { VOICE_SYNC_PATH } from "../constants/sync";
import { reactiveHub } from "./sync";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { demoRoutes, voiceConfig, realtimeVoicePlugin } from "./serverSetup";

const { absolutejs, manifest } = await prepare();

const server = new Elysia()
  .use(absolutejs)
  .use(pagesPlugin(manifest))
  .use(voice(voiceConfig))
  .use(realtimeVoicePlugin)
  .use(sync({ hub: reactiveHub, path: VOICE_SYNC_PATH }))
  .use(demoRoutes)
  .use(networking)
  .on("error", (error) => {
    const { request } = error;
    console.error(
      `Voice example error on ${request.method} ${request.url}: ${error.message}`,
    );
  });

export type Server = typeof server;
