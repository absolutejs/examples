# `@absolutejs/isolated-jsc` example

Live demo of [`@absolutejs/isolated-jsc`](https://github.com/absolutejs/isolated-jsc) — a Bun-native sandbox for executing untrusted JavaScript with heap isolation + CPU/memory caps.

Paste code on the left, hit **Run**, see the result and any host-captured `log` calls on the right. The canned presets each demonstrate one isolation guarantee:

- **Hello world** — calls the host-injected `log` Reference; output streams back to the host.
- **Host clock via Reference** — calls a host-defined `now()` function from inside the sandbox.
- **Runaway loop → TimeoutError** — tight `while (true) {}`; the host kills the isolate after the configured timeout.
- **Memory bomb → MemoryLimitError** — allocates heap-resident JS objects past the configured cap; the isolate self-terminates.
- **No host filesystem access** — documents what's reachable inside the worker today (v1 contract is heap isolation; v2 will narrow host-globals reachability).

## Run it

```bash
bun install
bun run dev
```

Open whatever port the dev server prints (defaults to `:3000`, override with `PORT=3100 bun run dev`).

## How it works

- `src/backend/sandbox.ts` — the `POST /api/run` endpoint. Each request spawns a fresh `Isolate`, exposes `log` and `now` host functions via `Reference`, compiles the user's code, runs it with the configured timeout, and returns the result + captured logs.
- `src/backend/server.ts` — wires the sandbox plugin into Elysia.
- `src/frontend/react/pages/SandboxPage.tsx` — single-page UI: source editor, memory/timeout inputs, result panel.

The example deliberately spawns a fresh isolate per request to make each demo self-contained. A real PaaS would pool isolates per tenant — see [`@absolutejs/sync`'s `sandboxedHandler`](https://github.com/absolutejs/sync/blob/main/src/engine/sandbox.ts) for a pooled implementation.

## What this doesn't show (yet)

- **Phase 2 hardening.** `@absolutejs/isolated-jsc` v0 ships heap isolation + soft resource caps; an attacker with code inside the worker can still reach `fetch`, `Bun`, `process` (the "No host filesystem access" preset documents this). Phase 2 — `bun:ffi` to a standalone libJSC build — will give a fully empty global object.
- **Synchronous Reference calls.** v0 References are async only (cross-thread message passing). v2 will add a synchronous variant via `Atomics.wait` + shared memory.
