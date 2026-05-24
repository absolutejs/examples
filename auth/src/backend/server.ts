import { networking } from "@absolutejs/absolute";
import { absoluteAuth } from "@absolutejs/auth";
import { Elysia } from "elysia";
import * as ReactRouterDOM from "react-router";
import { buildAuthHtmxConfig } from "./htmxConfig";
import { apiPlugin } from "./plugins/apiPlugin";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { absoluteAuthConfig } from "./shared/auth/config";
import { User } from "./shared/auth/schema";
import { createAuthRuntime } from "./shared/runtime";

// UniversalRouter resolves react-router via `globalThis.ReactRouterDOM` during
// server rendering; register it explicitly so SSR can find it.
Reflect.set(globalThis, "ReactRouterDOM", ReactRouterDOM);

const runtime = await createAuthRuntime();

const server = new Elysia()
  .use(
    await absoluteAuth<User>({
      ...absoluteAuthConfig(runtime.db),
      authSessionStore: runtime.authSessionStore,
      htmx: buildAuthHtmxConfig(runtime),
    }),
  )
  .use(apiPlugin(runtime))
  .post("/cleanup", async ({ cleanupSessions }) => {
    await cleanupSessions();
  })
  .use(pagesPlugin(runtime.manifest))
  .use(runtime.absolutejs)
  .use(networking)
  .on("error", (error) => {
    const { request } = error;
    console.error(
      `Server error on ${request.method} ${request.url}: ${error.message}`,
    );
  });

export type Server = typeof server;
