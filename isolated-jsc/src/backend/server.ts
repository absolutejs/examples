import { networking, prepare } from "@absolutejs/absolute";
import { Elysia } from "elysia";
import { hibernationPlugin } from "./hibernation";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { sandboxPlugin } from "./sandbox";

const { absolutejs, manifest } = await prepare();

const server = new Elysia()
  .use(absolutejs)
  .use(sandboxPlugin)
  .use(hibernationPlugin)
  .use(pagesPlugin(manifest))
  .use(networking)
  .on("error", (error) => {
    const { request } = error;
    console.error(
      `Server error on ${request.method} ${request.url}: ${error.message}`,
    );
  });

export type Server = typeof server;
