export type DemoBackendMode =
  | "sqlite-native"
  | "sqlite-fallback"
  | "postgres"
  | "pinecone";

export type DemoBackendDescriptor = {
  id: DemoBackendMode;
  label: string;
  path: string;
  available: boolean;
  reason?: string;
};

export type PineconeDemoBackendInput = {
  apiKey?: string;
  indexName?: string;
  namespace?: string;
  dimensions?: number;
};

export const RAG_DEMO_BACKEND_ORDER: DemoBackendMode[] = [
  "sqlite-native",
  "sqlite-fallback",
  "postgres",
  "pinecone",
];

export const getBackendPath = (mode: DemoBackendMode) => {
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

const PINECONE_DISABLED_REASON =
  "Set PINECONE_API_KEY and PINECONE_INDEX_NAME to enable the Pinecone backend.";

const isPineconeReady = (input?: PineconeDemoBackendInput) =>
  Boolean(
    typeof input?.apiKey === "string" &&
    input.apiKey.trim().length > 0 &&
    typeof input?.indexName === "string" &&
    input.indexName.trim().length > 0,
  );

export const listDemoBackends = (
  opts: {
    postgresUrl?: string;
    pinecone?: PineconeDemoBackendInput;
  } = {},
): DemoBackendDescriptor[] => {
  const postgresUrl =
    typeof opts.postgresUrl === "string" ? opts.postgresUrl.trim() : "";
  const pineconeReady = isPineconeReady(opts.pinecone);

  return RAG_DEMO_BACKEND_ORDER.map((id) => {
    if (id === "postgres") {
      return postgresUrl.length > 0
        ? {
            id: "postgres",
            label: "PostgreSQL",
            path: getBackendPath("postgres"),
            available: true,
          }
        : {
            id: "postgres",
            label: "PostgreSQL",
            path: getBackendPath("postgres"),
            available: false,
            reason:
              "Set RAG_POSTGRES_URL to enable the PostgreSQL pgvector backend.",
          };
    }

    if (id === "pinecone") {
      return pineconeReady
        ? {
            id: "pinecone",
            label: "Pinecone",
            path: getBackendPath("pinecone"),
            available: true,
          }
        : {
            id: "pinecone",
            label: "Pinecone",
            path: getBackendPath("pinecone"),
            available: false,
            reason: PINECONE_DISABLED_REASON,
          };
    }

    return {
      id,
      label: id === "sqlite-native" ? "SQLite Native" : "SQLite Fallback",
      path: getBackendPath(id),
      available: true,
    };
  });
};
