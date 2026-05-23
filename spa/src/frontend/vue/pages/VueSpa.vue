<script lang="ts">
// Declarative SPA routing: pass routes to defineRoutes() and AbsoluteJS
// handles the vue-router lifecycle for you (createRouter +
// createMemoryHistory on the server, createWebHistory in the browser,
// app.use(router), router.push(url) on SSR, await router.isReady()
// everywhere). Refresh on any sub-route — the server's initial HTML
// already shows the matching view, no setupApp boilerplate required.
//
// defineRoutes() is an identity helper at runtime. It's there so the
// import line documents the contract: this export is consumed by
// AbsoluteJS at compile time, not by any local code.
import { defineRoutes } from "@absolutejs/absolute/vue";
import Home from "../components/Home.vue";
import Profile from "../components/Profile.vue";
import Settings from "../components/Settings.vue";

export const routes = defineRoutes([
  { component: Home, path: "/vue" },
  { component: Settings, path: "/vue/settings" },
  { component: Profile, path: "/vue/profile" },
]);
</script>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import Nav from "../components/Nav.vue";

defineProps<{
  cssPath?: string;
}>();

const clicks = ref(0);
const route = useRoute();
</script>

<template>
  <Nav active="vue" vueVariant="spa" />

  <main>
    <div class="page-title">
      <img alt="Vue" height="32" src="/assets/svg/vue-logo.svg" />
      <h1>Vue</h1>
      <span class="badge">SPA via vue-router</span>
    </div>

    <p class="section-desc">
      This page exports a <code>routes</code> array — that's it. AbsoluteJS
      auto-installs vue-router with the right history mode for each environment,
      navigates to the request URL on the server, and waits for
      <code>router.isReady()</code> on both sides. No <code>setupApp</code> hook
      needed for routing alone.
    </p>

    <div class="portal-state">
      <span>
        Persistent layout state: <strong>{{ route.path }}</strong>
      </span>
      <span class="clicks">
        <button @click="clicks += 1">Layout clicks: {{ clicks }}</button>
      </span>
    </div>

    <div class="portal-layout">
      <aside class="portal-sidebar">
        <RouterLink :class="{ active: route.path === '/vue' }" to="/vue">
          Home
        </RouterLink>
        <RouterLink
          :class="{ active: route.path === '/vue/settings' }"
          to="/vue/settings"
        >
          Settings
        </RouterLink>
        <RouterLink
          :class="{ active: route.path === '/vue/profile' }"
          to="/vue/profile"
        >
          Profile
        </RouterLink>
      </aside>
      <section class="portal-content">
        <RouterView />
      </section>
    </div>

    <p class="section-desc" style="margin-top: 2rem">
      Need plugins like <RouterLink to="/vue-pinia">pinia</RouterLink> or
      <RouterLink to="/vue-i18n">vue-i18n</RouterLink>? Export
      <code>setupApp</code> alongside <code>routes</code> — the live router is
      in the context so you can add guards, install plugins, or both. See the
      linked pages for working examples.
    </p>

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
</template>
