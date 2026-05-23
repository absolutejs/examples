<script setup lang="ts">
type NavProps = {
  active?: string;
  vueVariant?: "spa" | "i18n" | "pinia";
};

defineProps<NavProps>();
</script>

<template>
  <header>
    <a class="logo" href="/">
      <img alt="AbsoluteJS" height="24" src="/assets/png/absolutejs-temp.png" />
      AbsoluteJS
    </a>
    <nav v-if="active === 'vue'" class="subnav">
      <span class="subnav-label">Vue variants:</span>
      <a :class="{ active: vueVariant === 'spa' }" href="/vue">SPA</a>
      <a :class="{ active: vueVariant === 'i18n' }" href="/vue-i18n"
        >+ vue-i18n</a
      >
      <a :class="{ active: vueVariant === 'pinia' }" href="/vue-pinia"
        >+ pinia</a
      >
    </nav>
    <nav>
      <a :class="{ active: active === 'react' }" href="/react">React</a>
      <a :class="{ active: active === 'svelte' }" href="/svelte">Svelte</a>
      <a :class="{ active: active === 'vue' }" href="/vue">Vue</a>
      <a :class="{ active: active === 'angular' }" href="/angular">Angular</a>
    </nav>
  </header>
</template>
