# AbsoluteJS — `@absolutejs/sync` example

Reactive push with [`@absolutejs/sync`](https://github.com/absolutejs/sync), shown
across every framework AbsoluteJS supports. A single server-side counter is
broadcast over Server-Sent Events; every open page — React, Vue, Svelte, Angular,
HTML, or HTMX, in any tab — updates the instant anyone bumps it. No polling.

## How it works

- **Server** (`src/backend/sync.ts`): `createReactiveHub()` + the `sync` Elysia
  plugin mount the SSE endpoint at `GET /sync`. `POST /api/bump` mutates the
  in-memory counter and `hub.publish("counter", { count })` fans the new value out
  to every subscriber.
- **Client**: React/Vue/Svelte/Angular use `createSyncSubscriber` from
  `@absolutejs/sync/client`; HTML/HTMX use the browser's native `EventSource`
  against the same `/sync` endpoint (the plugin speaks standard SSE).

## Run

```bash
bun install
bun run dev
```

Open <http://localhost:3000> and a second tab on `/vue` (or any framework). Bump
the counter in one — they all move together.

## One page per framework

| Route      | Framework |
| ---------- | --------- |
| `/`        | React     |
| `/vue`     | Vue       |
| `/svelte`  | Svelte    |
| `/angular` | Angular   |
| `/html`    | HTML      |
| `/htmx`    | HTMX      |
