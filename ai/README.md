# AbsoluteJS AI Example

A complete multi-framework chat application built with `@absolutejs/ai`. The
same backend powers React, Vue, Svelte, Angular, HTML, and HTMX clients while
demonstrating streaming responses, provider selection, tools, attachments,
reasoning output, and conversation persistence.

## Run it

```bash
bun install
bun run dev
```

Open `/` for React, `/vue`, `/svelte`, `/angular`, `/html`, or `/htmx` to compare
the framework integrations against the same server contract.

Provider credentials are read by the backend adapters. Configure only the
providers you intend to exercise; the mock provider can be used for local UI and
end-to-end development without an external model account.

## Architecture

- `src/backend/server.ts` boots the AbsoluteJS and Elysia application.
- `src/backend/handlers/providers.ts` exposes the available model providers.
- `src/backend/handlers/tools.ts` defines callable tools.
- `src/backend/handlers/database.ts` owns conversation persistence.
- `src/frontend/*` contains equivalent clients for each supported framework.
- `tests/e2e/live-conversation.spec.ts` verifies a conversation through the UI.

## Framework routes

```text
/          React
/vue       Vue
/svelte    Svelte
/angular   Angular
/html      HTML client
/htmx      HTMX client
```

The example is a private demonstration application, not an npm package. Copy the
relevant frontend and handler patterns into an AbsoluteJS application, then use
the public `@absolutejs/ai` entry points documented at
https://absolutejs.com/documentation/ai-overview.

## Validate changes

```bash
bun run typecheck
bun run lint
bun run test:e2e
```
