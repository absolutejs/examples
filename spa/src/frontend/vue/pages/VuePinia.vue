<script lang="ts">
// Escape hatch demo: this page combines `routes` (declarative routing)
// with `setupApp` (escape hatch for plugins that need app.use). The
// pinia store registered in setupApp is shared across both sub-routes
// — Catalog adds items, Cart shows them, the sidebar count tracks
// totals, all wired through the single store instance.
import { defineRoutes, defineVueSetupApp } from "@absolutejs/absolute/vue";
import { createPinia } from "pinia";
import Cart from "../components/pinia/Cart.vue";
import Catalog from "../components/pinia/Catalog.vue";

export const routes = defineRoutes([
  { component: Catalog, path: "/vue-pinia" },
  { component: Catalog, path: "/vue-pinia/catalog" },
  { component: Cart, path: "/vue-pinia/cart" },
]);

export const setupApp = defineVueSetupApp((app) => {
  // pinia is a Vue plugin — `app.use(createPinia())` registers the
  // store layer once for the whole app. After this, any component
  // anywhere in the tree can `useCartStore()` and read/write the same
  // reactive state without prop-drilling.
  app.use(createPinia());
});
</script>

<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useCartStore } from "../components/pinia/cartStore";
import Nav from "../components/Nav.vue";

defineProps<{
  cssPath?: string;
}>();

const cart = useCartStore();
const route = useRoute();
</script>

<template>
  <Nav active="vue" vueVariant="pinia" />

  <main>
    <div class="page-title">
      <img alt="Vue" height="32" src="/assets/svg/vue-logo.svg" />
      <h1>Vue + pinia</h1>
      <span class="badge">setupApp escape hatch</span>
    </div>

    <p class="section-desc">
      <code>routes</code> handles the SPA navigation.
      <code>setupApp</code> installs <code>pinia</code> via
      <code>app.use(createPinia())</code>. The cart store lives outside any
      single component — both sub-routes read and write the same reactive state.
    </p>

    <div class="portal-state">
      <span>
        Path: <strong>{{ route.path }}</strong>
      </span>
      <span class="clicks">
        <strong>Cart: {{ cart.count }} items</strong>
      </span>
    </div>

    <div class="portal-layout">
      <aside class="portal-sidebar">
        <RouterLink
          :class="{
            active:
              route.path === '/vue-pinia' ||
              route.path === '/vue-pinia/catalog',
          }"
          to="/vue-pinia"
        >
          Catalog
        </RouterLink>
        <RouterLink
          :class="{ active: route.path === '/vue-pinia/cart' }"
          to="/vue-pinia/cart"
        >
          Cart ({{ cart.count }})
        </RouterLink>
      </aside>
      <section class="portal-content">
        <RouterView />
      </section>
    </div>

    <p class="footer">
      <RouterLink to="/vue">← Back to Vue SPA</RouterLink>
    </p>
  </main>
</template>
