# AbsoluteJS Service Worker Example

A multi-framework demonstration of Service Worker capabilities built with [AbsoluteJS](https://github.com/absolutejs/absolutejs). The same interactive demo is implemented in React, Vue, Svelte, Angular, and vanilla HTML — all served from a single application.

## Features

- **Registration & Lifecycle** — Register/unregister service workers and track state transitions in real time (installing → activated → redundant)
- **Cache Management** — Precache URLs on install, cache on demand, inspect cached items, and delete individually or clear all
- **Message Passing** — Ping the service worker and measure round-trip latency via MessageChannel
- **Fetch Interception** — Cache-first strategy for assets, network-first for navigation with offline fallback
- **Offline Support** — Test cached vs uncached resources offline with graceful error handling

## Getting Started

**Prerequisites:** [Bun](https://bun.sh/)

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Then open the app in your browser. Each framework demo is available at its own route:

| Route | Framework |
|-------|-----------|
| `/` | React |
| `/svelte` | Svelte |
| `/vue` | Vue |
| `/angular` | Angular |
| `/html` | Vanilla HTML |

## Production Build

```bash
bun run compile   # Compile server to single executable
bun start         # Start production server
```

## Other Commands

```bash
bun run typecheck  # TypeScript type checking
bun run lint       # ESLint
bun run format     # Prettier
```

## Project Structure

```
src/
├── backend/
│   ├── server.ts             # Elysia server setup
│   ├── sw.ts                 # Service worker script
│   └── plugins/
│       └── pagesPlugin.ts    # Route handlers for all framework pages
└── frontend/
    ├── constants.ts          # Shared constants (cache URLs, ping intervals)
    ├── react/                # React demo page & components
    ├── svelte/               # Svelte demo page & components
    ├── vue/                  # Vue demo page & components
    ├── angular/              # Angular demo page & template
    ├── html/                 # Vanilla HTML demo & scripts
    └── styles/               # Shared CSS
```

## How the Service Worker Works

The service worker (`src/backend/sw.ts`) is served at `/sw.js` with the appropriate `Service-Worker-Allowed` header. It implements:

- **Install** — Precaches a configurable list of URLs and broadcasts status updates to all clients
- **Activate** — Cleans up old caches and claims all open clients
- **Fetch** — Cache-first for `/assets/` paths, network-first for navigation requests with an offline fallback page
- **Messages** — Handles ping/pong, cache CRUD operations, and status queries via `postMessage`
