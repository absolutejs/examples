import { networking, prepare } from "@absolutejs/absolute";
import { Elysia } from "elysia";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { securityPlugin } from "./plugins/securityPlugin";

const { absolutejs, manifest } = await prepare();

const server = new Elysia()
  .use(absolutejs)
  .use(securityPlugin)
  .use(pagesPlugin(manifest))
  .use(networking);

export type Server = typeof server;
