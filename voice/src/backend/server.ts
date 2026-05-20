import { networking, prepare } from "@absolutejs/absolute";
import { voice } from "@absolutejs/voice";

import { Elysia } from "elysia";

import { pagesPlugin } from "./plugins/pagesPlugin";
import {
  demoRoutes,
  intakeVoiceConfig,
  realtimeVoicePlugin,
} from "./serverSetup";

const { absolutejs, manifest } = await prepare();

const server = new Elysia()
  .use(absolutejs)
  .use(pagesPlugin(manifest))
  .use(voice(intakeVoiceConfig))
  .use(realtimeVoicePlugin)
  .use(demoRoutes)
  .use(networking)
  .on("error", (error) => {
    const { request } = error;
    console.error(
      `Voice example error on ${request.method} ${request.url}: ${error.message}`,
    );
  });

export type Server = typeof server;
export default server;
