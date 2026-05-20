import { prepare } from "@absolutejs/absolute";
import { createNeonAuthSessionStore } from "@absolutejs/auth";
import type { AuthUser } from "../../../shared/auth/config";
import { listDemoBackends } from "../../../shared/demoBackends";

export const createWebRuntime = async () => {
  const { absolutejs, manifest } = await prepare();

  const authDatabaseUrl =
    process.env.AUTH_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!authDatabaseUrl) {
    throw new Error(
      "AUTH_DATABASE_URL or DATABASE_URL is required for the RAG example auth session store",
    );
  }

  return {
    absolutejs,
    authDatabaseUrl,
    authSessionStore: createNeonAuthSessionStore<AuthUser>(authDatabaseUrl),
    backendDescriptors: listDemoBackends({
      postgresUrl: process.env.RAG_POSTGRES_URL,
      pinecone: {
        apiKey: process.env.PINECONE_API_KEY,
        indexName: process.env.PINECONE_INDEX_NAME,
      },
    }),
    manifest,
  };
};
