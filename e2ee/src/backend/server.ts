import { networking, prepare } from "@absolutejs/absolute";
import { Elysia } from "elysia";
import { pagesPlugin } from "./plugins/pagesPlugin";

const { absolutejs, manifest } = await prepare();

const server = new Elysia()
  .use(absolutejs)
  .use(pagesPlugin(manifest))
  .use(networking);

export type Server = typeof server;
