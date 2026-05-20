# absolutejs-spa-example

Demonstrates intra-framework SPA navigation in AbsoluteJS using each
framework's **native** router. The top-level route between frameworks
(`/react` → `/svelte`) is a full-page MPA navigation. The sub-routes
inside each framework page (`/react/settings`, `/react/profile`) are
client-side SPA navigations driven by the framework's own router.

The point: AbsoluteJS doesn't ship a router. Users install
`react-router-dom` / `vue-router` / `svelte-routing` themselves; the
adapter just makes the SSR pass cooperate so SEO, deep-link load, and
refresh-mid-route all work.

## Run

    bun install
    bun run dev

Open <http://localhost:3000>.

## What to look at

- `src/frontend/{react,svelte,vue,angular}/pages/*` — each framework's
  SPA page wires its native router. Refreshing on a sub-route renders
  the correct view because the request URL is forwarded to the router
  on the server.
- `src/backend/plugins/pagesPlugin.ts` — Elysia routes use wildcard
  patterns (`/react/*` etc.) so the same handler responds for every
  sub-URL.
- **React** uses `<StaticRouter location={url}>` on the server and
  `<BrowserRouter>` on the client. URL is plumbed as a normal prop.
- **Svelte** uses `<Router url={url}>` from `svelte-routing`. URL is
  plumbed as a normal prop.
- **Angular** uses `provideRouter` exported from the page module.
  AbsoluteJS forwards `request.url` into `renderApplication`.
- **Vue** exports a `setupApp(app, { url, isServer })` hook from the
  page module. AbsoluteJS calls this on both server and client, so
  `app.use(router)` + `router.push(url)` + `router.isReady()` runs in
  both environments.

## Note on the Vue adapter

The Vue `setupApp` convention is new in `@absolutejs/absolute@0.19.0-beta.817`.
Page modules export `setupApp(app, { url, isServer })`; AbsoluteJS calls
it on both server (in `pageHandler.ts`, before `renderToWebStream`) and
client (in `compileVue.ts`'s auto-generated index, before `app.mount()`).
This is the only way to get vue-router cooperating with SSR + hydration
without forking the Vue mount path.
