import { Database } from "bun:sqlite";

export const createRagDatabase = () => {
  const ragDb = new Database("./rag-store.sqlite");
  ragDb.exec(`
    CREATE TABLE IF NOT EXISTS demo_ui_state (
      scope TEXT NOT NULL,
      id TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, id)
    )
  `);

  return ragDb;
};
