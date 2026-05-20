import { createNeonAuthSessionStore } from "@absolutejs/auth";
import type { AuthUser } from "../../../shared/auth/config";

export const createRagAuthRuntime = () => {
  const authDatabaseUrl =
    process.env.AUTH_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!authDatabaseUrl) {
    throw new Error(
      "AUTH_DATABASE_URL or DATABASE_URL is required for the RAG example auth session store",
    );
  }

  return {
    authDatabaseUrl,
    authSessionStore: createNeonAuthSessionStore<AuthUser>(authDatabaseUrl),
  };
};
