# Loading Convention Files

The `loading.tsx` / `loading.svelte` / `loading.vue` / `loading.ts` convention files in this project are placeholders. They are detected and scanned during the build, but **not wired into the runtime yet**.

## Why

Loading states show a fallback UI while the next page is being fetched during **client-side navigation**. AbsoluteJS currently does full page loads — every navigation is a fresh server request. There's no gap between "user clicked a link" and "new page arrives" where a loading fallback would display.

Loading convention support will be implemented alongside the `<Link>` component and client-side navigation system (ROADMAP item 3). That feature intercepts link clicks, fetches partial HTML from the server, and swaps the page content without a full reload. The loading component fills the content area during that fetch.

## What each framework supports

- **React** — `<Suspense>` with streaming SSR via `renderToReadableStream`. The loading fallback streams first, resolved content fills in after.
- **Vue** — `<Suspense>` (experimental) with similar streaming SSR support.
- **Svelte** — `{#await}` blocks for async rendering.
- **Angular** — `@defer` blocks for lazy loading with fallback UI.

## Implementation plan

1. Build the `<Link>` component and client-side navigation module (shared `navigate.ts` + per-framework wrappers)
2. Add server-side partial rendering (respond with just `<main>` content when `X-AbsoluteJS-Nav: partial` header is present)
3. Wire loading convention files into the navigation system — show the loading component while the partial fetch is in progress
4. For React, also wrap pages in `<Suspense fallback={<Loading />}>` during SSR streaming when async data is used
