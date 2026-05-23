import { getEnv, prepare } from "@absolutejs/absolute";
import { createNeonAuthSessionStore } from "@absolutejs/auth";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { schema, User } from "./auth/schema";
import { createDrizzleLinkedProviderStores } from "./linkedProviders/stores";

export const createAuthRuntime = async () => {
  const { absolutejs, manifest } = await prepare();
  const databaseUrl = getEnv("DATABASE_URL");
  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });
  const authSessionStore = createNeonAuthSessionStore<User>(databaseUrl);
  const { bindingStore, grantStore } = createDrizzleLinkedProviderStores(db);

  return {
    absolutejs,
    authSessionStore,
    bindingStore,
    db,
    grantStore,
    manifest,
  };
};

export type AuthRuntime = Awaited<ReturnType<typeof createAuthRuntime>>;
