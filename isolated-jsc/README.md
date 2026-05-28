# `@absolutejs/isolated-jsc` example

Live demo of [`@absolutejs/isolated-jsc`](https://github.com/absolutejs/isolated-jsc), a Bun-native sandbox for executing untrusted JavaScript with heap isolation, CPU timeouts, memory caps, brokered host capabilities, execution receipts, output limits, and an FFI backend when JavaScriptCore is available.

Paste code on the left, hit **Run**, see the result and any host-captured `log` calls on the right. The canned presets each demonstrate one isolation guarantee:

- **Hello world** — calls the host-injected `log` Reference; output streams back to the host.
- **Host clock via Reference** — calls a host-defined `now()` function from inside the sandbox.
- **Runaway loop -> TimeoutError** — tight `while (true) {}`; the host enforces the configured timeout.
- **Memory bomb -> MemoryLimitError** — allocates heap-resident JS objects past the configured cap; the isolate terminates.
- **No host filesystem access** — shows the hardened default global shape: host capability globals are not exposed directly.
- **Result limit -> ResultSizeError** — returns a payload larger than `maxResultBytes`; the host rejects it before app code accepts it.
- **Console limit -> receipt flag** — emits more console lines than the host forwards; the receipt records truncation.

## Run it

```bash
bun install
bun run dev
```

Open whatever port the dev server prints (defaults to `:3000`, override with `PORT=3100 bun run dev`).

## How it works

- `src/backend/sandbox.ts` — the `POST /api/run` endpoint. Each request uses `runIsolated()` with the `tenant-script` policy, exposes `log` and `now` through a typed capability broker, applies timeout/memory/result/console/audit limits, and returns the result, manifest, redacted audit events, receipt, backend metrics, and captured logs. The demo pins `backend: "worker"` so console capture is visible on every machine; production hostile-code paths should prefer FFI where JavaScriptCore is installed.
- `src/backend/server.ts` — wires the sandbox plugin into Elysia.
- `src/frontend/react/pages/SandboxPage.tsx` — single-page UI: source editor, memory/timeout inputs, result panel.

The example deliberately uses one-shot execution to keep each demo self-contained. A real PaaS should use `createIsolatedRunner()` to pool by tenant/session, precompile hot callables, and expose host powers through typed capability tools with manifests and receipts.

## Backend decision guide

- Use `backend: "auto"` for this demo, local development, and CI. It uses FFI when libJSC is reachable and falls back to Worker when it is not.
- Use `backend: "ffi"` for production hostile-code paths on macOS/Linux where JavaScriptCore is installed. FFI has lower cold heap, interrupt-driven timeouts, survives timeouts, and closes eval / Function-constructor residuals.
- If you must run arbitrary third-party code on the Worker fallback, add process/container isolation and keep host secrets, filesystem permissions, and network egress out of reach.
- For user plugins or agent tools, expose only explicit host capabilities, validate inputs, redact audited values, bound audit buffers, set timeouts, and audit every call.

## Related examples

- `~/abs/examples/sync` shows the application surface where sandboxed per-tenant mutation handlers matter. It keeps handlers in-process for clarity, but the hosted path should run customer-authored handlers through `@absolutejs/isolated-jsc`.
- The package repo example, `bun run example:agent-tool` in `~/abs/isolated-jsc`, shows typed capability tools, tenant context, audit events, and per-call metrics.
