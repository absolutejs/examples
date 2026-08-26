import { networking, prepare } from "@absolutejs/absolute";
import { Elysia } from "elysia";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { workflowPlugin } from "./plugins/workflowPlugin";

const { absolutejs, manifest } = await prepare();

const server = new Elysia()
  .use(absolutejs)
  .use(workflowPlugin)
  .use(pagesPlugin(manifest))
  .use(networking);

export type Server = typeof server;
