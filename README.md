# AbsoluteJS examples

Each directory is a standalone example app. Pick one, `cd` in, `bun install`, `bun dev`.

| Example                                               | Demonstrates                                                                                               | Companion package          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------- |
| [`ai/`](./ai)                                         | Multi-provider chat / completion using `@absolutejs/ai`                                                    | `@absolutejs/ai`           |
| [`auth/`](./auth)                                     | 6-framework OAuth2 login, identity linking/merging, and connector grants against `@absolutejs/auth`        | `@absolutejs/auth`         |
| [`crm/`](./crm)                                       | 6-framework lead-capture form against `@absolutejs/crm` runtime + local entity store                       | `@absolutejs/crm`          |
| [`error-boundaries/`](./error-boundaries)             | Per-route error boundaries, fallback UIs, RUM hooks                                                        | `@absolutejs/absolute`     |
| [`image-optimization/`](./image-optimization)         | Image pipeline: format negotiation, responsive srcsets, blur placeholders                                  | `@absolutejs/absolute`     |
| [`isolated-jsc/`](./isolated-jsc)                     | Browser demo for Bun-native sandboxed JavaScript execution with timeouts, memory caps, and host References | `@absolutejs/isolated-jsc` |
| [`island/`](./island)                                 | Server-rendered pages with hydrated islands across React/Vue/Svelte/Angular                                | `@absolutejs/absolute`     |
| [`out-of-order-streaming/`](./out-of-order-streaming) | Streamed-HTML responses with `Suspense`-style out-of-order slots                                           | `@absolutejs/absolute`     |
| [`rag-vector/`](./rag-vector)                         | Retrieval-augmented chat with SQLite vector store + corpus ingestion                                       | `@absolutejs/rag`          |
| [`service-worker/`](./service-worker)                 | PWA shell, offline cache strategies, background sync                                                       | `@absolutejs/absolute`     |
| [`spa/`](./spa)                                       | Single-page-app mode with client-side routing                                                              | `@absolutejs/absolute`     |
| [`stylelab/`](./stylelab)                             | Style pipeline: tokens, theming, dark-mode, framework-agnostic emit                                        | `@absolutejs/absolute`     |
| [`voice/`](./voice)                                   | Real voice-agent stack: STT/LLM/TTS, telephony, evals, observability                                       | `@absolutejs/voice`        |
| [`web-worker/`](./web-worker)                         | Off-main-thread compute via Web Workers + comlink-style RPC                                                | `@absolutejs/absolute`     |

## Running an example

```sh
cd voice
bun install
bun dev
```

Each example has its own `package.json`, `tsconfig.json`, `absolute.config.ts`, and `.gitignore`. No workspace tooling — they're intentionally independent so you can copy any single directory into a fresh project as a starting point.

## Checks

Run checks from inside the example you are changing. Most examples expose `bun run typecheck`; examples with browser coverage also expose `bun run test`. Today that includes `image-optimization/`, `sync/`, and `isolated-jsc/`.

## History

These were previously twelve separate repos under the `absolutejs` org. They were consolidated here in May 2026 to reduce maintenance overhead. The original repos are now archived on GitHub.
