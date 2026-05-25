# AbsoluteJS — `@absolutejs/sync` example

The [`@absolutejs/sync`](https://github.com/absolutejs/sync) **Tier 3 sync engine**,
shown across every framework AbsoluteJS supports. A shared task list is a live
collection: each page hydrates once over a WebSocket, then the server pushes
`{ added, removed, changed }` diffs — no polling. Edits apply optimistically and
reconcile when the server confirms. Open two tabs (or two frameworks) and every
open client stays in sync.

## How it works

- **Server** (`src/backend/sync.ts`): `createSyncEngine()` registers a `tasks`
  collection and `addTask`/`toggleTask`/`removeTask` mutations, exposed over one
  Elysia WebSocket via `syncSocket` at `/sync/ws`. A mutation writes the in-memory
  store and emits the row change; the engine turns it into a diff for every
  subscriber.
- **Client** — one idiomatic binding per framework, all over the same socket:
  - React (`/`): `useSyncCollection` from `@absolutejs/sync/react`
  - Vue (`/vue`): `useSyncCollection` from `@absolutejs/sync/vue`
  - Svelte (`/svelte`): `createSyncCollectionStore` from `@absolutejs/sync/svelte`
  - Angular (`/angular`): `SyncCollectionService` from `@absolutejs/sync/angular`
  - HTML & HTMX (`/html`, `/htmx`): a native `WebSocket` speaking the engine's
    frame protocol directly — no framework runtime needed.

All of them return the same `{ data, status, error, mutate }` and open the socket
on the client only (SSR-safe).

## Run

```bash
bun install
bun run dev
```

Open <http://localhost:3000> and a second tab on `/vue` (or any framework). Add,
toggle, or delete a task in one — they all update together.

## One page per framework

| Route      | Framework | Binding                                       |
| ---------- | --------- | --------------------------------------------- |
| `/`        | React     | `useSyncCollection` (`/react`)                |
| `/vue`     | Vue       | `useSyncCollection` (`/vue`)                  |
| `/svelte`  | Svelte    | `createSyncCollectionStore` (`/svelte`)       |
| `/angular` | Angular   | `SyncCollectionService` (`/angular`)          |
| `/html`    | HTML      | native `WebSocket`                            |
| `/htmx`    | HTMX      | native `WebSocket`                            |
