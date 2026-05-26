# Issues — the @absolutejs/sync flagship example

A small, focused collaborative issue tracker that dogfoods the whole
`@absolutejs/sync` stack end-to-end in one app:

- **Live filtered queries** — the sidebar issue list is a reactive query; every
  status change, create, or delete from any tab streams in over the WebSocket.
- **Full-text search** — type in the search box; results re-rank live as
  issues are created or edited (a server-side BM25 index kept current from the
  same change feed).
- **CRDT collaborative descriptions** — open the same issue in two tabs and
  type at the same time. The description is a row field declared as a CRDT
  (`engine.registerCrdt('issues', { body: rgaText })`); concurrent edits merge
  on the server with no clobbering. No per-keystroke server round-trip — the
  client holds the live text and uploads only delta ops.
- **Declarative row-level permissions** — `?role=viewer` connects read-only;
  writes are rejected by the server, the optimistic edit rolls back, and a
  banner shows you why. No client guarding.
- **Schema validation** — the `issues` table has a typed schema; bad writes
  reject with `SchemaError` and the transaction rolls back.
- **Scheduled functions** — the "open · in progress · done" counts in the
  header tick from a cron job that runs every 10 seconds on the server and
  writes a live `pulse` row. No polling.
- **Optimistic mutations + offline-safe writes** — every create/status/delete
  applies instantly client-side and reconciles when the server confirms.
- **Devtools** — visit `/sync/devtools` for the live engine dashboard
  (collections + subscription counts + a streaming change feed).

What this is _not_ trying to be: a complete Linear clone. It's tight on
purpose. Add columns, projects, comments, ai/rag retrieval, etc. on top — every
one of them is a single registration on the engine.

## Run it

```bash
bun install
PORT=3101 bun run dev      # or `bun run start` for the production server
```

Open `http://localhost:3101`. Try:

- Open the same issue in two tabs and type in the description.
- `?role=viewer` to see the permission rejection.
- `/sync/devtools` for the live engine dashboard.
- `bun test` (Playwright) for the e2e suite.

## What you'll find in the code

- `src/backend/sync.ts` — the whole engine: collections, permissions, schema,
  CRDT field, search, scheduled function, mutations. ~200 lines.
- `src/backend/server.ts` — Elysia entrypoint; mounts `syncSocket` + the
  scheduled-functions plugin + devtools + the React page.
- `src/frontend/react/components/IssuesContent.tsx` — the whole UI; uses
  `useSyncCollection` for the lists + `useCollaborativeText` for the
  description editor.
- `tests/issues.test.ts` — Playwright e2e covering the live, search,
  collaborative-merge, and viewer-permission flows.
