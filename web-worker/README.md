# Web Worker Test

A demo project showcasing web workers across 5 frontend frameworks (React, Svelte, Vue, Angular, HTML) — all running in a single app powered by [AbsoluteJS](https://absolutejs.com).

Each framework page demonstrates 6 web worker patterns:

- **SHA-256 Hash** — cryptographic hashing offloaded to a worker
- **Prime Finder** — CPU-bound computation off the main thread
- **Sort Array** — sorting 1M numbers without blocking the UI
- **Thread Race** — worker vs main thread timer comparison
- **Image Processing** — grayscale conversion via transferable pixel data
- **Parallel Race** — 3 concurrent workers with different workloads

## Setup

```bash
bun install
```

## Development

```bash
bun run dev
```

Starts the dev server with HMR at http://localhost:3000.

## Production

```bash
bun run start
```

Builds assets, bundles the server, and runs in production mode.

## Compile to Standalone Executable

```bash
bun run compile
```

Compiles the entire app into a single standalone binary (`./compiled-server`) with all assets embedded — no `node_modules`, no `dist/` folder, no Bun installation needed on the target machine.

```bash
bun run serve
# or just
./compiled-server
```

The compiled binary:
- Pre-renders all pages at build time
- Embeds all JS, CSS, images, and web workers into the executable
- Serves everything from Bun's virtual filesystem
- Works on any machine without dependencies

## Static Config

Pages can be pre-rendered at build time via the `static` config in `absolute.config.ts`:

```ts
export default defineConfig({
  // ...
  static: {
    routes: "all",       // or ["/", "/html"]
    revalidate: 60,      // optional — re-render stale pages every 60s
  },
});
```

Without `revalidate`, pages are rendered once at build time (SSG). With `revalidate`, stale pages are served immediately while a fresh version renders in the background (ISR).
