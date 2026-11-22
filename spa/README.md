# absolutejs-spa-example

Single-page navigation inside AbsoluteJS pages, in React, Svelte, Vue and
Angular. Moving between frameworks (`/react` → `/svelte`) is an ordinary
page load. Moving inside one (`/react` → `/react/settings`) is client-side
navigation: the layout, sidebar and any state stay mounted, and only the
page area changes.

Every sub-route is server-rendered. Load or refresh `/vue/settings`
directly and the HTML already holds the Settings view, which then hydrates
in place.

## Run

    bun install
    bun run dev

Open <http://localhost:3000>. For the production build, run `bun run start`.

## Pages load when they're first shown

Each page inside a router is its own chunk. The browser downloads Settings
the first time you open Settings, not with the layout. A page opened once
opens instantly after that.

You don't write anything for this. Import the page normally and put it in
the router; the build does the splitting for every framework:

```tsx
// React: src/frontend/react/components/PortalShell.tsx
import { Settings } from "./Settings";
<Route element={<Settings />} path="/react/settings" />;
```

```svelte
<!-- Svelte: src/frontend/svelte/pages/SvelteSpa.svelte -->
<Route path="/svelte/settings">
  {#snippet content()}<Settings />{/snippet}
</Route>
```

```ts
// Vue: src/frontend/vue/pages/VueSpa.vue
export const routes = defineRoutes([
  { component: Settings, path: "/vue/settings" },
]);
```

```ts
// Angular: src/frontend/angular/pages/angular-spa/angular-spa.ts
export const routes: Routes = [
  { component: SettingsComponent, path: "settings" },
];
```

What stays in the entry, so it renders at once:

- layout routes (routes with child routes)
- wrappers around a page, such as an auth guard or a page frame
- any component the file also uses outside the router

## How each framework is wired

- **React**: `UniversalRouter` from `@absolutejs/absolute/react/router`
  with react-router's `<Routes>`/`<Route>`. It renders from the request
  URL on the server and uses the browser's history on the client.
- **Svelte**: the framework's own router, `Router`, `Route` and `Link`
  from `@absolutejs/absolute/svelte/router`. The page passes the request
  URL to `<Router url={url}>`.
- **Vue**: export `routes = defineRoutes([...])` from the page. AbsoluteJS
  creates vue-router for you (memory history on the server, web history
  in the browser) and waits for it before rendering and before hydrating.
  `VuePinia.vue` and `VueI18n.vue` also export `defineVueSetupApp(...)` to
  install a plugin (`app.use(createPinia())`, `app.use(i18n)`) on both
  sides.
- **Angular**: export `routes` from the page module. AbsoluteJS finds it,
  provides the router and sets `APP_BASE_HREF` from the page's mount
  (`/angular/`).

On the server, `src/backend/plugins/pagesPlugin.ts` mounts each page at
a wildcard (`/react/*` and so on), so one handler answers for every
sub-route.
