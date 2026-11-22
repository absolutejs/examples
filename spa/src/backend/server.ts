import { networking, prepare } from "@absolutejs/absolute";
import { Elysia } from "elysia";
import { pagesPlugin } from "./plugins/pagesPlugin";

const { absolutejs, manifest } = await prepare();

const server = new Elysia()
  .use(absolutejs)
  .use(pagesPlugin(manifest))
  .use(networking)
  .onError(({ error, request }) => {
    console.error(
      `Server error on ${request.method} ${request.url}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  });

export type Server = typeof server;
