import { getEnv, networking, prepare } from "@absolutejs/absolute";
import { auth, createNeonAuthSessionStore } from "@absolutejs/auth";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { type AnyElysia, Elysia } from "elysia";
import { apiPlugin } from "./plugins/apiPlugin";
import { pagesPlugin } from "./plugins/pagesPlugin";
import { schema, User } from "../../db/schema";
import { authConfig } from "./auth/config";
import { buildShowcaseBlocks } from "./auth/showcaseBlocks";
import { createDrizzleLinkedProviderStores } from "./linkedProviders/stores";
import { authHtmxConfig } from "./utils/htmxConfig";

const { absolutejs, manifest } = await prepare();
const databaseUrl = getEnv("DATABASE_URL");
const origin = process.env.PUBLIC_ORIGIN ?? "http://localhost:3000";
const rpId = new URL(origin).hostname;
const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });
const authSessionStore = createNeonAuthSessionStore<User>(databaseUrl);
const { bindingStore, grantStore } = createDrizzleLinkedProviderStores(db);

// The showcase blocks (credentials / MFA / WebAuthn / passwordless / sessions / audit /
// OAuth2 IdP) wire the post-OAuth surfaces of @absolutejs/auth so the example covers
// every stable release through 0.40.0. Each block is independent — drop one and only
// its routes disappear. See ./auth/showcaseBlocks.ts for the per-block hooks.
const showcase = await buildShowcaseBlocks({ databaseUrl, db, origin, rpId });

// Widen the async auth plugin (carrying ~40+ routes since 0.32) so TS does NOT
// accumulate the giant per-route type across the whole `.use()` chain — that
// merged type is intractable for tsc and trips TS2590. Same pattern intent uses
// (see ~/intent/src/backend/server.ts:244). Mount order + runtime are unchanged.
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentional type-erasure to keep the .use() chain under TS's union budget; see comment above
const authPlugin = auth<User>({
  ...authConfig(db),
  ...showcase,
  authSessionStore,
  htmx: authHtmxConfig({ bindingStore, db, grantStore }),
}) as Promise<AnyElysia>;

const server = new Elysia()
  .use(authPlugin)
  .use(
    apiPlugin({
      auditStore: showcase.audit.auditStore,
      authSessionStore,
      bindingStore,
      db,
      grantStore,
    }),
  )
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
