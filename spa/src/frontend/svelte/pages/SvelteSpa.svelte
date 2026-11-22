<script lang="ts">
  import Link from "@absolutejs/absolute/svelte/router/Link.svelte";
  import Route from "@absolutejs/absolute/svelte/router/Route.svelte";
  import Router from "@absolutejs/absolute/svelte/router/Router.svelte";
  import { page } from "@absolutejs/absolute/svelte/router";
  import Home from "../components/Home.svelte";
  import Nav from "../components/Nav.svelte";
  import Profile from "../components/Profile.svelte";
  import Settings from "../components/Settings.svelte";

  type SvelteSpaProps = {
    cssPath?: string;
    url?: string;
  };

  let { cssPath, url }: SvelteSpaProps = $props();

  let clicks = $state(0);
</script>

<div>
  <Nav active="svelte" {cssPath} />

  <Router {url}>
    <main>
      <div class="page-title">
        <img alt="Svelte" height="32" src="/assets/svg/svelte-logo.svg" />
        <h1>Svelte</h1>
        <span class="badge">SPA via @absolutejs/absolute/svelte/router</span>
      </div>

      <p class="section-desc">
        Refresh on any sub-route — the server renders the right view because the
        page handler forwards the request URL into the page's props, and the
        page passes that into <code>&lt;Router url=&#123;url&#125;&gt;</code> on the
        server.
      </p>

      <div class="portal-state">
        <span>
          Persistent layout state: <strong>{page.url.pathname}</strong>
        </span>
        <span class="clicks">
          <button onclick={() => (clicks += 1)}>Layout clicks: {clicks}</button>
        </span>
      </div>

      <div class="portal-layout">
        <aside class="portal-sidebar">
          <Link
            to="/svelte"
            class={page.url.pathname === "/svelte" ? "active" : ""}
          >
            Home
          </Link>
          <Link
            to="/svelte/settings"
            class={page.url.pathname === "/svelte/settings" ? "active" : ""}
          >
            Settings
          </Link>
          <Link
            to="/svelte/profile"
            class={page.url.pathname === "/svelte/profile" ? "active" : ""}
          >
            Profile
          </Link>
        </aside>
        <section class="portal-content">
          <Route path="/svelte">
            {#snippet content()}<Home />{/snippet}
          </Route>
          <Route path="/svelte/settings">
            {#snippet content()}<Settings />{/snippet}
          </Route>
          <Route path="/svelte/profile">
            {#snippet content()}<Profile />{/snippet}
          </Route>
        </section>
      </div>

      <p class="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          AbsoluteJS
        </a>
      </p>
    </main>
  </Router>
</div>
