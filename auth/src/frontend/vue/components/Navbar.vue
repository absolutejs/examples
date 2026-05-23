<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { NAV_ITEMS } from "../../shared/navData";
import { useAuth } from "../composables/useAuth";

const { handleSignOut, user } = useAuth();
const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
const items = NAV_ITEMS;
const base = "/vue";

const linkTo = (path: string) => (path === "" ? base : `${base}/${path}`);

const onSignOut = async () => {
  await handleSignOut();
  menuOpen.value = false;
  router.push(base);
};
</script>

<template>
  <header class="navbar">
    <RouterLink class="navbar__brand" :to="base">
      <img alt="" src="/assets/png/absolutejs-temp.png" />
      Absolute Auth
    </RouterLink>

    <nav class="navbar__links">
      <RouterLink
        v-for="item in items"
        :key="item.path"
        class="navbar__link"
        :to="linkTo(item.path)"
        :aria-current="route.path === linkTo(item.path) ? 'page' : undefined"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="navbar__user">
      <template v-if="user">
        <span class="muted">
          {{ user.email ?? user.first_name ?? "Account" }}
        </span>
        <button class="btn btn--ghost btn--sm" type="button" @click="onSignOut">
          Sign out
        </button>
      </template>
      <RouterLink v-else class="btn btn--primary btn--sm" :to="base">
        Sign in
      </RouterLink>
      <button
        class="hamburger"
        type="button"
        aria-label="Toggle menu"
        @click="menuOpen = !menuOpen"
      >
        <span class="hamburger__bar" />
        <span class="hamburger__bar" />
        <span class="hamburger__bar" />
      </button>
    </div>

    <div :class="menuOpen ? 'hamburger-menu is-open' : 'hamburger-menu'">
      <div class="hamburger-menu__header">
        <strong>Menu</strong>
        <button
          class="btn btn--ghost btn--sm"
          type="button"
          @click="menuOpen = false"
        >
          Close
        </button>
      </div>
      <RouterLink
        v-for="item in items"
        :key="item.path"
        class="navbar__link"
        :to="linkTo(item.path)"
        @click="menuOpen = false"
      >
        {{ item.label }}
      </RouterLink>
      <button
        v-if="user"
        class="btn btn--ghost"
        type="button"
        @click="onSignOut"
      >
        Sign out
      </button>
    </div>
  </header>
</template>
