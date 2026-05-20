import {
  createHeuristicRAGQueryTransform,
  createHeuristicRAGReranker,
  createHeuristicRAGRetrievalStrategy,
  createRAGCollection,
  createRAGSyncScheduler,
} from "@absolutejs/rag";
import type { Database } from "bun:sqlite";
import { createDemoAIProviderCatalog } from "../ragAiProvider";
import { createRAGBackends } from "../ragBackends";
import { createRagDemoState } from "../ragDemoState";

export const createRagPipeline = (ragDb: Database) => {
  const postgresUrl = process.env.RAG_POSTGRES_URL;
  const pineconeDimensionsEnv = process.env.PINECONE_DIMENSIONS;
  const pineconeDimensions = pineconeDimensionsEnv
    ? Number.parseInt(pineconeDimensionsEnv, 10)
    : undefined;
  const ragBackends = createRAGBackends({
    db: ragDb,
    path: "./rag-store.sqlite",
    postgresUrl,
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY,
      indexName: process.env.PINECONE_INDEX_NAME,
      namespace: process.env.PINECONE_NAMESPACE,
      dimensions:
        Number.isInteger(pineconeDimensions) && pineconeDimensions! > 0
          ? pineconeDimensions
          : undefined,
    },
  });
  const ragDemoState = createRagDemoState({ ragBackends, ragDb });
  const demoAIProvider = createDemoAIProviderCatalog();
  const indexManager = ragDemoState.createIndexManager();
  const syncScheduler = createRAGSyncScheduler({
    manager: {
      ...indexManager,
      syncAllSources: (options) =>
        indexManager.syncAllSources({ ...(options ?? {}), background: true }),
      syncSource: (id, options) =>
        indexManager.syncSource(id, { ...(options ?? {}), background: true }),
    },
    schedules: [
      {
        id: "directory-sync",
        intervalMs: 15_000,
        label: "Directory sync fixtures",
        runImmediately: true,
        sourceIds: ["sync-directory"],
      },
    ],
  });
  const demoReranker = createHeuristicRAGReranker();
  const demoQueryTransform = createHeuristicRAGQueryTransform();
  const demoRetrievalStrategy = createHeuristicRAGRetrievalStrategy();
  const createDemoCollection = (
    backend: ReturnType<typeof createRAGBackends>["backends"][keyof ReturnType<
      typeof createRAGBackends
    >["backends"]],
    queryTransform?: typeof demoQueryTransform,
  ) =>
    createRAGCollection({
      queryTransform,
      rerank: demoReranker,
      retrievalStrategy: demoRetrievalStrategy,
      store: backend.rag!.store,
    });

  return {
    createDemoCollection,
    demoAIProvider,
    demoQueryTransform,
    demoReranker,
    demoRetrievalStrategy,
    indexManager,
    ragBackends,
    ragDemoState,
    syncScheduler,
  };
};
