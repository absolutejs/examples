import type { Database } from "bun:sqlite";
import type {
  DemoBackendMode,
  DemoFrameworkId,
} from "../../../frontend/demo-backends";

export const createDemoUIStateController = (ragDb: Database) => {
  const readUIState = ragDb.query<{ value: string }, [string, string]>(
    "SELECT value FROM demo_ui_state WHERE scope = ?1 AND id = ?2",
  );

  const writeUIState = ragDb.query<never, [string, string, string, number]>(`
    INSERT INTO demo_ui_state (scope, id, value, updated_at)
    VALUES (?1, ?2, ?3, ?4)
    ON CONFLICT(scope, id) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

  const getStateId = (framework: DemoFrameworkId, mode: DemoBackendMode) =>
    `${framework}:${mode}`;

  return {
    getRecentQueries(framework: DemoFrameworkId, mode: DemoBackendMode) {
      const state = readUIState.get(
        "recent-queries",
        getStateId(framework, mode),
      );
      if (!state) {
        return [];
      }

      try {
        const parsed = JSON.parse(state.value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    setRecentQueries(
      framework: DemoFrameworkId,
      mode: DemoBackendMode,
      payload: unknown[],
    ) {
      writeUIState.run(
        "recent-queries",
        getStateId(framework, mode),
        JSON.stringify(payload),
        Date.now(),
      );
    },
    getActiveRetrieval(framework: DemoFrameworkId, mode: DemoBackendMode) {
      const state = readUIState.get(
        "active-retrieval",
        getStateId(framework, mode),
      );
      if (!state) {
        return null;
      }

      try {
        return JSON.parse(state.value) as Record<string, unknown> | null;
      } catch {
        return null;
      }
    },
    setActiveRetrieval(
      framework: DemoFrameworkId,
      mode: DemoBackendMode,
      payload: Record<string, unknown>,
    ) {
      writeUIState.run(
        "active-retrieval",
        getStateId(framework, mode),
        JSON.stringify(payload),
        Date.now(),
      );
    },
  };
};
