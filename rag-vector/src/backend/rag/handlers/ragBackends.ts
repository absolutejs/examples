import { join } from "node:path";
import {
  createRAGCollection,
  loadRAGDocumentsFromDirectory,
  prepareRAGDocument,
  type RAGBackendCapabilities,
  type RAGChunkingStrategy,
  type RAGCollection,
  type RAGContentFormat,
  type RAGDocumentIngestInput,
  type RAGPreparedDocument,
  type RAGVectorStore,
  type RAGVectorStoreStatus,
} from "@absolutejs/rag";
import { createPostgresRAGStore } from "@absolutejs/rag-postgres";
import { createSQLiteRAG } from "@absolutejs/rag-sqlite";
import type { SQLiteRAG } from "@absolutejs/rag-sqlite";
import { createPineconeRAG } from "@absolutejs/rag-pinecone";
import type { Database } from "bun:sqlite";
import { ragDemoExtractors } from "./ragDemoExtractors";

export type RagDocumentKind = "seed" | "custom";
export type DemoBackendMode =
  | "sqlite-native"
  | "sqlite-fallback"
  | "postgres"
  | "pinecone";
export type DemoContentFormat = RAGContentFormat;
export type DemoChunkingStrategy = RAGChunkingStrategy;

export type RagSeedEmbeddingVariant = {
  id: string;
  label?: string;
  text?: string;
  metadata?: Record<string, unknown>;
};

export type RagSeedDocument = {
  id: string;
  text: string;
  title?: string;
  source?: string;
  format?: DemoContentFormat;
  chunkStrategy?: DemoChunkingStrategy;
  kind?: RagDocumentKind;
  metadata?: Record<string, unknown>;
  embeddingVariants?: RagSeedEmbeddingVariant[];
};

export type DemoBackendDescriptor = {
  id: DemoBackendMode;
  label: string;
  path: string;
  available: boolean;
  reason?: string;
};

type SQLiteRagAdapter = SQLiteRAG;
type PostgresRagAdapter = {
  collection: RAGCollection;
  getCapabilities?: () => RAGBackendCapabilities;
  getStatus?: () => RAGVectorStoreStatus;
  store: RAGVectorStore;
};
type PineconeRagAdapter = {
  collection: RAGCollection;
  getCapabilities?: () => RAGBackendCapabilities;
  getStatus?: () => RAGVectorStoreStatus;
  store: RAGVectorStore;
};
type DemoRAGAdapter =
  | SQLiteRagAdapter
  | PostgresRagAdapter
  | PineconeRagAdapter;

export type DemoRAGBackend = DemoBackendDescriptor & {
  rag?: DemoRAGAdapter;
};

export const DEFAULT_BACKEND_MODE: DemoBackendMode = "sqlite-native";
export const RAG_DEMO_DEFAULT_CHUNK_SIZE = 420;
export const RAG_DEMO_DEFAULT_CUSTOM_CHUNK_SIZE = 320;
export const RAG_DEMO_DOCUMENT_TABLE_NAME = "rag_demo_documents";
const RAG_DEMO_BACKEND_ORDER: DemoBackendMode[] = [
  "sqlite-native",
  "sqlite-fallback",
  "postgres",
  "pinecone",
];

const RAG_DEMO_PINECONE_DIMENSIONS = 1024;
const DEMO_CORPUS_DIR = join(process.cwd(), "corpus");

const SQLITE_NATIVE_TABLE_NAME = "rag_demo_vectors_native_vec0";
const SQLITE_NATIVE_CHUNK_TABLE_NAME = "rag_demo_vectors_native_chunks";
const SQLITE_FALLBACK_TABLE_NAME = "rag_demo_vectors_fallback";

const DEFAULT_SEED_STRATEGY: DemoChunkingStrategy = "source_aware";
const DEFAULT_CUSTOM_STRATEGY: DemoChunkingStrategy = "paragraphs";

const createChunkingDefaults = (
  strategy: DemoChunkingStrategy,
  maxChunkLength: number,
) => ({
  chunkOverlap:
    strategy === "fixed" ? 0 : Math.min(80, Math.floor(maxChunkLength / 6)),
  maxChunkLength,
  minChunkLength: 40,
  strategy,
});

const toPreparedDocument = (
  doc: RagSeedDocument,
  kind: RagDocumentKind = doc.kind ?? "seed",
): RAGPreparedDocument => {
  const format =
    doc.format ??
    (doc.source?.endsWith(".html") || doc.source?.endsWith(".htm")
      ? "html"
      : doc.source?.endsWith(".md") || doc.source?.endsWith(".mdx")
        ? "markdown"
        : "text");
  const strategy =
    doc.chunkStrategy ??
    (kind === "seed" ? DEFAULT_SEED_STRATEGY : DEFAULT_CUSTOM_STRATEGY);
  const maxChunkLength =
    kind === "seed"
      ? RAG_DEMO_DEFAULT_CHUNK_SIZE
      : RAG_DEMO_DEFAULT_CUSTOM_CHUNK_SIZE;

  return prepareRAGDocument({
    chunking: createChunkingDefaults(strategy, maxChunkLength),
    format,
    id: doc.id,
    metadata: {
      ...(doc.metadata ?? {}),
      documentId: doc.id,
      kind,
    },
    source: doc.source,
    text: doc.text,
    title: doc.title,
  });
};

export const countPreparedChunks = (
  doc: RagSeedDocument,
  kind: RagDocumentKind = doc.kind ?? "seed",
) => toPreparedDocument(doc, kind).chunks.length;

const loadSeedCorpusInput = async (): Promise<RAGDocumentIngestInput> =>
  loadRAGDocumentsFromDirectory({
    baseMetadata: {
      kind: "seed",
      sourceKind: "corpus",
    },
    defaultChunking: createChunkingDefaults(
      DEFAULT_SEED_STRATEGY,
      RAG_DEMO_DEFAULT_CHUNK_SIZE,
    ),
    directory: DEMO_CORPUS_DIR,
    extractors: ragDemoExtractors,
  });

const multivectorSeedDocument: RagSeedDocument = {
  chunkStrategy: "source_aware",
  embeddingVariants: [
    {
      id: "launch-checklist",
      label: "Launch checklist",
      metadata: { phraseFamily: "launch" },
      text: "aurora launch packet sign-off checklist",
    },
    {
      id: "rollback-steps",
      label: "Rollback steps",
      metadata: { phraseFamily: "rollback" },
      text: "tungsten recovery drill for operators",
    },
  ],
  format: "markdown",
  id: "multivector-release-guide",
  metadata: {
    feature: "multivector",
    retrievalFocus: "late-interaction",
    sourceKind: "virtual-demo-doc",
  },
  source: "guide/multivector-release-guide.md",
  text: "AbsoluteJS late interaction retrieval keeps one parent chunk while indexing phrase-level embeddings for release-readiness callouts, operator recovery drills, and follow-up diagnostics. The demo should prove that exact sub-span wording can win retrieval without splitting the parent document into separate source chunks.",
  title: "Late interaction release guide",
};

export const getSeedDocuments = async (): Promise<RagSeedDocument[]> => {
  const loaded = await loadSeedCorpusInput();

  return [
    ...loaded.documents.map((doc) => {
      const prepared = prepareRAGDocument(
        doc,
        createChunkingDefaults(
          DEFAULT_SEED_STRATEGY,
          RAG_DEMO_DEFAULT_CHUNK_SIZE,
        ),
      );

      return {
        chunkStrategy: DEFAULT_SEED_STRATEGY,
        format: prepared.format,
        id: prepared.documentId,
        kind: "seed",
        metadata: prepared.metadata,
        source: prepared.source,
        text: doc.text,
        title: prepared.title,
      } satisfies RagSeedDocument;
    }),
    multivectorSeedDocument,
  ];
};

type RAGStoreOptions = {
  path?: string;
  db?: Database;
};

const createSQLiteNativeRAG = (opts: RAGStoreOptions = {}): SQLiteRagAdapter =>
  createSQLiteRAG({
    storeOptions: {
      db: opts.db,
      dimensions: 24,
      native: {
        distanceMetric: "cosine",
        mode: "vec0",
        requireAvailable: false,
        tableName: SQLITE_NATIVE_TABLE_NAME,
      },
      path: opts.path,
      tableName: SQLITE_NATIVE_CHUNK_TABLE_NAME,
    },
  });

const createSQLiteFallbackRAG = (
  opts: RAGStoreOptions = {},
): SQLiteRagAdapter =>
  createSQLiteRAG({
    storeOptions: {
      db: opts.db,
      dimensions: 24,
      path: opts.path,
      tableName: SQLITE_FALLBACK_TABLE_NAME,
    },
  });

const createPostgresDemoRAG = (
  connectionString: string,
): PostgresRagAdapter => {
  const store = createPostgresRAGStore({
    connectionString,
    dimensions: 24,
    distanceMetric: "cosine",
    queryMultiplier: 4,
    schemaName: "absolute_rag_demo",
    tableName: "chunks",
  });
  const collection = createRAGCollection({ store });

  return {
    collection,
    store,
    getCapabilities: () => store.getCapabilities!(),
    getStatus: () => store.getStatus!(),
  };
};

export type PineconeDemoBackendInput = {
  apiKey?: string;
  indexName?: string;
  namespace?: string;
  dimensions?: number;
};

const createPineconeDemoRAG = (
  options: Required<Pick<PineconeDemoBackendInput, "apiKey" | "indexName">> &
    Pick<PineconeDemoBackendInput, "namespace" | "dimensions">,
): PineconeRagAdapter => {
  const rag = createPineconeRAG({
    apiKey: options.apiKey,
    indexName: options.indexName,
    namespace: options.namespace,
    vector: {
      dimensions: options.dimensions ?? RAG_DEMO_PINECONE_DIMENSIONS,
      distanceMetric: "cosine",
      provider: "pinecone",
    },
  });

  return {
    collection: rag.collection,
    store: rag.store,
    getCapabilities: () => rag.store.getCapabilities!(),
  };
};

const PINECONE_DISABLED_REASON =
  "Set PINECONE_API_KEY and PINECONE_INDEX_NAME to enable the Pinecone backend.";

const isPineconeReady = (input?: PineconeDemoBackendInput) =>
  Boolean(
    typeof input?.apiKey === "string" &&
    input.apiKey.trim().length > 0 &&
    typeof input?.indexName === "string" &&
    input.indexName.trim().length > 0,
  );

const getBackendPath = (mode: DemoBackendMode) => {
  switch (mode) {
    case "sqlite-fallback":
      return "/rag/sqlite-fallback";
    case "postgres":
      return "/rag/postgres";
    case "pinecone":
      return "/rag/pinecone";
    case "sqlite-native":
    default:
      return "/rag/sqlite-native";
  }
};

export const createRAGBackends = (
  opts: RAGStoreOptions & {
    postgresUrl?: string;
    pinecone?: PineconeDemoBackendInput;
  },
) => {
  const sqliteNative = createSQLiteNativeRAG(opts);
  const sqliteFallback = createSQLiteFallbackRAG(opts);
  const postgresUrl =
    typeof opts.postgresUrl === "string" ? opts.postgresUrl.trim() : "";
  const pineconeReady = isPineconeReady(opts.pinecone);

  const backends: Record<DemoBackendMode, DemoRAGBackend> = {
    "sqlite-native": {
      available: true,
      id: "sqlite-native",
      label: "SQLite Native",
      path: getBackendPath("sqlite-native"),
      rag: sqliteNative,
    },
    "sqlite-fallback": {
      available: true,
      id: "sqlite-fallback",
      label: "SQLite Fallback",
      path: getBackendPath("sqlite-fallback"),
      rag: sqliteFallback,
    },
    postgres:
      postgresUrl.length > 0
        ? {
            available: true,
            id: "postgres",
            label: "PostgreSQL",
            path: getBackendPath("postgres"),
            rag: createPostgresDemoRAG(postgresUrl),
          }
        : {
            available: false,
            id: "postgres",
            label: "PostgreSQL",
            path: getBackendPath("postgres"),
            reason:
              "Set RAG_POSTGRES_URL to enable the PostgreSQL pgvector backend.",
          },
    pinecone: pineconeReady
      ? {
          available: true,
          id: "pinecone",
          label: "Pinecone",
          path: getBackendPath("pinecone"),
          rag: createPineconeDemoRAG({
            apiKey: opts.pinecone!.apiKey!.trim(),
            dimensions: opts.pinecone?.dimensions,
            indexName: opts.pinecone!.indexName!.trim(),
            namespace: opts.pinecone?.namespace,
          }),
        }
      : {
          available: false,
          id: "pinecone",
          label: "Pinecone",
          path: getBackendPath("pinecone"),
          reason: PINECONE_DISABLED_REASON,
        },
  };

  const list = (): DemoBackendDescriptor[] =>
    RAG_DEMO_BACKEND_ORDER.map((id) => {
      const backend = backends[id];

      return {
        available: backend.available,
        id: backend.id,
        label: backend.label,
        path: backend.path,
        reason: backend.reason,
      };
    });

  const active = (): DemoRAGBackend[] =>
    list().flatMap((descriptor) => {
      const backend = backends[descriptor.id];

      return backend.available && backend.rag ? [backend] : [];
    });

  return {
    active,
    backends,
    defaultMode: DEFAULT_BACKEND_MODE,
    list,
  };
};

export const seedRAGStore = async (
  ragStore: RAGVectorStore,
  documents: RagSeedDocument[],
) => {
  const chunks = documents.flatMap((document) => {
    const kind = document.kind ?? "seed";
    const strategy =
      document.chunkStrategy ??
      (kind === "seed" ? DEFAULT_SEED_STRATEGY : DEFAULT_CUSTOM_STRATEGY);
    const maxChunkLength =
      kind === "seed"
        ? RAG_DEMO_DEFAULT_CHUNK_SIZE
        : RAG_DEMO_DEFAULT_CUSTOM_CHUNK_SIZE;
    const prepared = prepareRAGDocument({
      chunking: createChunkingDefaults(strategy, maxChunkLength),
      format: document.format,
      id: document.id,
      metadata: {
        ...(document.metadata ?? {}),
        documentId: document.id,
        kind,
      },
      source: document.source,
      text: document.text,
      title: document.title,
    });

    return prepared.chunks.map((chunk, index) =>
      index === 0 &&
      document.embeddingVariants &&
      document.embeddingVariants.length > 0
        ? { ...chunk, embeddingVariants: document.embeddingVariants }
        : chunk,
    );
  });

  const collection = createRAGCollection({ store: ragStore });
  await collection.ingest({ chunks });

  return chunks.length;
};
