# citra example

A runnable AbsoluteJS showcase for [`citra`](https://www.npmjs.com/package/citra) — the
TypeScript OAuth2 client. It exercises `authorize`, `callback`, `refresh`, `revoke`, and
fetch-profile flows against every supported provider.

This project imports the **published** `citra` package (see `package.json`), so it doubles as
an integration check against the real npm release rather than local source.

## Run

```bash
bun install
bun run dev      # watch mode on the example server
# or
bun run start
```

Provider credentials are read from the environment by the plugins in `providers/`. Copy your
own client IDs/secrets in before exercising a given provider.

## Scripts

- `bun run dev` / `bun run start` — boot the Elysia + React showcase (`server.ts`)
- `bun run lint` / `bun run typecheck` / `bun run format` — via the AbsoluteJS CLI
