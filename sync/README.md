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

## Sandboxed handlers

This example keeps mutation handlers in-process so the sync surfaces are easy to inspect. For customer-authored mutations, AI-generated transforms, or plugin code, run handlers through `@absolutejs/isolated-jsc` instead of calling them directly in the app process.

- Use `backend: "ffi"` for hostile-code production paths on macOS/Linux where JavaScriptCore is available.
- Use `backend: "auto"` for local development, CI, and demos so the Worker fallback keeps the example portable.
- If you must rely on the Worker fallback for arbitrary third-party code, add process/container isolation and avoid sharing host secrets or broad network/file permissions.
- Expose host powers as typed capability tools or narrow `Reference`s: validate inputs, set timeouts, and audit calls.

The hosted AbsoluteJS sync path uses this shape for sandboxed per-tenant mutation handlers; this example stays unsandboxed to keep the framework bindings and reactive collections front and center.

## Run

```bash
bun install
bun run dev
```

Open <http://localhost:3000> and a second tab on `/vue` (or any framework). Add,
toggle, or delete a task in one — they all update together.

## One page per framework

| Route      | Framework | Binding                                 |
| ---------- | --------- | --------------------------------------- |
| `/`        | React     | `useSyncCollection` (`/react`)          |
| `/vue`     | Vue       | `useSyncCollection` (`/vue`)            |
| `/svelte`  | Svelte    | `createSyncCollectionStore` (`/svelte`) |
| `/angular` | Angular   | `SyncCollectionService` (`/angular`)    |
| `/html`    | HTML      | native `WebSocket`                      |
| `/htmx`    | HTMX      | native `WebSocket`                      |
