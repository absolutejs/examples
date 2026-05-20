import { networking } from "@absolutejs/absolute";
import { Elysia } from "elysia";
import { buildRagAbsoluteAuth } from "../shared/auth/config";
import { createWebRuntime } from "./handlers/runtime/createWebRuntime";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { createRagProxyPlugin } from "./plugins/ragProxyPlugin";

const runtime = await createWebRuntime();

export const server = new Elysia()
  .use(
    await buildRagAbsoluteAuth({
      authDatabaseUrl: runtime.authDatabaseUrl,
      authSessionStore: runtime.authSessionStore,
    }),
  )
  .use(pagesPlugin(runtime.manifest, { backends: runtime.backendDescriptors }))
  .use(createRagProxyPlugin())
  .use(runtime.absolutejs)
  .use(networking)
  .on("error", ({ code, error, request }) => {
    console.error(
      `Server error [${code}] on ${request.method} ${request.url}: ${error.message ?? ""}`,
    );
  });

export type Server = typeof server;
