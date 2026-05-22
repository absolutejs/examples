# Agent notes

## Running the dev workspace headlessly

`bun run dev` (= `absolute workspace dev`) starts the multi-service workspace:

| service  | port  | visibility | notes                                  |
| -------- | ----- | ---------- | -------------------------------------- |
| postgres | 55433 | internal   | pgvector container                     |
| rag      | 3001  | internal   | browser reaches it only via the proxy  |
| web      | 3000  | public     | the app + Angular/React/Vue/Svelte/etc |

By default it renders an **interactive TUI** (alternate screen + hotkeys) that
needs a real terminal. In a non-interactive shell (CI, an AI agent like Claude
Code) the dashboard can't be driven, so run it **headless** — it streams plain
logs instead and stops on Ctrl+C / SIGTERM:

```sh
bun run dev --no-tui      # requires @absolutejs/absolute >= 0.19.0-beta.1010
# or:
CI=1 bun run dev
```

The app is at http://localhost:3000; the framework demos are at
`/<framework>/<mode>`, e.g. http://localhost:3000/angular/sqlite-native
(modes: `sqlite-native`, `sqlite-fallback`, `postgres`). The rag service does a
lazy knowledge-base init (tens of seconds) before its WebSocket accepts
connections.

## Running services directly (no orchestrator)

Useful when you can't run the workspace process. Make sure postgres is up
(`bun run pg:start`), then start each service yourself:

```sh
PG=postgresql://postgres:postgres@127.0.0.1:55433/absolute_rag_demo

RAG_POSTGRES_URL=$PG PORT=3001 ABSOLUTE_WORKSPACE_SERVICE_NAME=rag \
  bun src/backend/rag/server.ts

RAG_POSTGRES_URL=$PG PORT=3000 ABSOLUTE_WORKSPACE_SERVICE_NAME=web \
  ABSOLUTE_SERVICE_RAG_URL=http://localhost:3001 \
  bun src/backend/web/server.ts
```

Set `PORT` explicitly per service: the shared root `.env` defines a global
`PORT` that would otherwise apply to both.
