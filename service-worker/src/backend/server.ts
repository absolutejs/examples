import { networking, prepare } from "@absolutejs/absolute";
import { Elysia } from "elysia";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { SW_SCRIPT } from "./sw";

const { absolutejs, manifest } = await prepare();

const server = new Elysia()
  .use(absolutejs)
  .get("/sw.js", ({ set }) => {
    set.headers["content-type"] = "application/javascript";
    set.headers["service-worker-allowed"] = "/";

    return SW_SCRIPT;
  })
  .use(pagesPlugin(manifest))
  .use(networking)
  .on("error", (error) => {
    const { request } = error;
    console.error(
      `Server error on ${request.method} ${request.url}: ${error.message}`,
    );
  });

export type Server = typeof server;
