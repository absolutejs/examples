# AbsoluteJS Out-of-Order Streaming Example

An example project demonstrating the [AbsoluteJS](https://absolutejs.com) out-of-order streaming model across React, Svelte, Vue, and Angular.

## What Is Out-of-Order Streaming?

Out-of-order streaming lets slow async sections stream as soon as they resolve instead of blocking everything above them in the response. Fast content arrives first, then slower stream slots patch in independently.

## What This Example Shows

- **Per-framework streaming pages** - A dedicated route for each framework that uses `StreamSlot`.
- **Fallback while waiting** - Async chunks render with placeholders while work is still pending.
- **Out-of-order delivery** - Streamed slots resolve independently and patch in by slot ID.
- **Cross-framework routing** - One backend plugin drives React, Svelte, Vue, Angular, HTML, and HTMX routes.
- **Shared example architecture** - The app follows the same multi-framework example pattern used across the other AbsoluteJS example repositories.

## Prerequisites

- [Bun](https://bun.sh) (v1.1+)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/alexkahndev/absolutejs-out-of-order-streaming-example.git
cd absolutejs-out-of-order-streaming-example

# Install dependencies
bun install

# Start the dev server
bun run dev
```

The dev server will start and print the local URL (default `http://localhost:3000`).

## Scripts

| Command             | Description                           |
| ------------------- | ------------------------------------- |
| `bun run dev`       | Start the development server with HMR |
| `bun run start`     | Start the production server           |
| `bun run lint`      | Run ESLint                            |
| `bun run format`    | Format code with Prettier             |
| `bun run typecheck` | Run type checking across all frameworks |

## How It Works

Each streaming page renders fast shell content immediately, then defers slower sections into independently resolving stream slots. When a section finishes, AbsoluteJS patches that slot into the response without waiting for the rest of the page.

This repository includes equivalent examples for React, Vue, Svelte, and Angular, plus plain HTML and HTMX reference routes for comparison.

## Routes

| Path                | Framework | Description |
| ------------------- | --------- | ----------- |
| `/`                 | React     | React out-of-order streaming demo |
| `/react-streaming`  | React     | Alias for the React streaming demo |
| `/vue`              | Vue       | Vue out-of-order streaming demo |
| `/vue-streaming`    | Vue       | Alias for the Vue streaming demo |
| `/svelte`           | Svelte    | Svelte out-of-order streaming demo |
| `/svelte-streaming` | Svelte    | Alias for the Svelte streaming demo |
| `/angular`          | Angular   | Angular out-of-order streaming demo |
| `/angular-streaming`| Angular   | Alias for the Angular streaming demo |
| `/html`             | HTML      | Static reference page |
| `/htmx`             | HTMX      | Static reference page |
