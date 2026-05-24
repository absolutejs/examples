# AbsoluteJS — `@absolutejs/queue` example

Background jobs with [`@absolutejs/queue`](https://github.com/absolutejs/queue),
shown across every framework AbsoluteJS supports. An in-process worker drains a
typed job queue; every page — React, Vue, Svelte, Angular, HTML, or HTMX —
enqueues work and polls the live status as the worker picks jobs up, retries the
occasional transient failure, and marks them `done`.

## How it works

- **Server** (`src/backend/queue.ts`): `defineJobs()` declares the typed job
  kinds and `createJobRegistry()` registers their handlers. The `queue` Elysia
  plugin mounts the in-process worker (auto-starts) and decorates the context
  with `queue.enqueue`. `POST /api/enqueue` adds a `demo.task`, and
  `GET /api/jobs` returns the current job list plus per-status counts. The
  handler simulates work and occasionally fails the first attempt so the queue's
  automatic retry is visible.
- **Client**: every framework fetches `GET /api/jobs` on mount and polls it once
  a second, wiring an "Enqueue job" button to `POST /api/enqueue` and rendering
  the live stats + job list.

## Run

```bash
bun install
bun run dev
```

Open <http://localhost:3000>, enqueue a few jobs, and watch them move from
`Queued` to `Running` to `Done` (with a retry now and then).

## One page per framework

| Route      | Framework |
| ---------- | --------- |
| `/`        | React     |
| `/vue`     | Vue       |
| `/svelte`  | Svelte    |
| `/angular` | Angular   |
| `/html`    | HTML      |
| `/htmx`    | HTMX      |
