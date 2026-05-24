import { getEnv, networking, prepare } from "@absolutejs/absolute";
import { auth, createNeonAuthSessionStore } from "@absolutejs/auth";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { Elysia } from "elysia";
import { apiPlugin } from "./plugins/apiPlugin";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { authConfig } from "./shared/auth/config";
import { schema, User } from "./shared/auth/schema";
import { createDrizzleLinkedProviderStores } from "./shared/linkedProviders/stores";
import { buildAuthHtmxConfig } from "./utils/htmxConfig";

const { absolutejs, manifest } = await prepare();
const databaseUrl = getEnv("DATABASE_URL");
const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });
const authSessionStore = createNeonAuthSessionStore<User>(databaseUrl);
const { bindingStore, grantStore } = createDrizzleLinkedProviderStores(db);

const server = new Elysia()
  .use(
    await auth<User>({
      ...authConfig(db),
      authSessionStore,
      htmx: buildAuthHtmxConfig({ bindingStore, db, grantStore }),
    }),
  )
  .use(apiPlugin({ authSessionStore, bindingStore, db, grantStore }))
  .post("/cleanup", async ({ cleanupSessions }) => {
    await cleanupSessions();
  })
  .use(pagesPlugin(manifest))
  .use(absolutejs)
  .use(networking)
  .on("error", (error) => {
    const { request } = error;
    console.error(
      `Server error on ${request.method} ${request.url}: ${error.message}`,
    );
  });

export type Server = typeof server;
