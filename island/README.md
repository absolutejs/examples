# AbsoluteJS Islands Example

An example project demonstrating the [AbsoluteJS](https://absolutejs.com) islands architecture — mix **React**, **Svelte**, **Vue**, **Angular**, **HTML**, and **HTMX** components on the same page with shared state across frameworks.

## What Are Islands?

Islands architecture renders most of the page as static HTML on the server and selectively hydrates interactive "islands" on the client. Each island is a self-contained component that can be written in any supported framework and hydrated independently using one of three strategies:

- **`hydrate="load"`** — Hydrate immediately when the page loads (eager).
- **`hydrate="idle"`** — Hydrate when the browser is idle via `requestIdleCallback`.
- **`hydrate="visible"`** — Hydrate when the island scrolls into the viewport via `IntersectionObserver`.

## What This Example Shows

- **Multi-framework islands** — React, Svelte, Vue, and Angular counter components all coexist on the same page, each hydrated independently.
- **Shared cross-framework state** — A shared counter store (`counterIslandStore`) built with `createIslandStore` allows all islands, regardless of framework, to read and write shared state.
- **Typed islands** — A central island registry provides full TypeScript type inference for framework, component name, and props when using `TypedReactIsland`, `TypedSvelteIsland`, `TypedVueIsland`, or `TypedAngularIsland`.
- **Loose islands** — The untyped `<Island>` primitive allows ad-hoc usage without the registry for quick prototyping.
- **Multiple host pages** — The same islands render from host pages written in React (`/`), Vue (`/vue`), Svelte (`/svelte`), Angular (`/angular`), plain HTML (`/html`), and HTMX (`/htmx`).
- **Elysia server** — The backend uses [Elysia](https://elysiajs.com) with the AbsoluteJS plugin for SSR, asset serving, and routing.

## Prerequisites

- [Bun](https://bun.sh) (v1.1+)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/alexkahndev/absolutejs-island-example.git
cd absolutejs-island-example

# Install dependencies
bun install

# Start the dev server
bun run dev
```

The dev server will start and print the local URL (default `http://localhost:3000`).

## Scripts

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `bun run dev`      | Start the development server with HMR    |
| `bun run start`    | Start the production server              |
| `bun run lint`     | Run ESLint                               |
| `bun run format`   | Format code with Prettier                |
| `bun run typecheck`| Run type checking across all frameworks  |

## Project Structure

```
src/
├── backend/
│   ├── assets/              # Static assets (icons, images, SVGs)
│   ├── plugins/
│   │   └── pagesPlugin.ts   # Route definitions for each host page
│   ├── server.ts            # Elysia server setup
│   └── vueImporter.ts       # Vue SSR import helper
└── frontend/
    ├── angular/             # Angular island components and host page
    ├── client/
    │   └── bootstrap.ts     # Client-side island hydration bootstrap
    ├── html/                # Plain HTML host page
    ├── htmx/                # HTMX host page
    ├── islands/
    │   ├── counterStore.ts  # Shared cross-framework state store
    │   └── registry.ts      # Central island registry (type-safe)
    ├── react/               # React island components and host page
    ├── styles/              # Global styles
    ├── svelte/              # Svelte island components and host page
    └── vue/                 # Vue island components and host page
```

## How It Works

### 1. Define a shared store

```ts
// src/frontend/islands/counterStore.ts
export const counterIslandStore = createIslandStore("counter", {
  sharedCount: 0,
}, (set) => ({
  incrementShared: () => set((state) => ({ sharedCount: state.sharedCount + 1 })),
  resetShared: () => set({ sharedCount: 0 }),
}));
```

### 2. Register island components

```ts
// src/frontend/islands/registry.ts
export const islandRegistry = defineIslandRegistry({
  react:   { ReactCounter },
  svelte:  { SvelteCounter },
  vue:     { VueCounter },
  angular: { AngularCounter },
});
```

### 3. Use islands in any host page

```tsx
// In a React host page
<TypedReactIsland
  framework="react"
  component="ReactCounter"
  hydrate="load"
  props={{ initialCount: 0, label: "React island" }}
/>

// Embed a Svelte island inside a React page
<TypedReactIsland
  framework="svelte"
  component="SvelteCounter"
  hydrate="visible"
  props={{ initialCount: 0, label: "Svelte island" }}
/>
```

Every framework has its own typed island helper (`TypedReactIsland`, `TypedSvelteIsland`, etc.) so props are fully type-checked regardless of which framework the host page is written in.

## Routes

| Path       | Host Framework | Description                          |
| ---------- | -------------- | ------------------------------------ |
| `/`        | React          | All island types and hydration modes |
| `/vue`     | Vue            | Vue host page with mixed islands     |
| `/svelte`  | Svelte         | Svelte host page with mixed islands  |
| `/angular` | Angular        | Angular host page with mixed islands |
| `/html`    | HTML           | Plain HTML host page                 |
| `/htmx`    | HTMX           | HTMX host page                      |
