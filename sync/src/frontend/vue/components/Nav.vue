<script setup lang="ts">
defineOptions({ name: "Nav" });
</script>

<template>
  <header>
    <a href="/vue" class="logo">
      <img src="/assets/png/absolutejs-temp.png" height="24" alt="AbsoluteJS" />
      AbsoluteJS
    </a>
    <nav>
      <a href="/">React</a>
      <a href="/svelte">Svelte</a>
      <a href="/vue" class="active">Vue</a>
      <a href="/angular">Angular</a>
      <a href="/html">HTML</a>
      <a href="/htmx">HTMX</a>
      <a
        class="devtools"
        href="/sync/devtools"
        rel="noopener noreferrer"
        target="_blank"
        title="Live engine inspector — collections, mutations, activity, and point-in-time replay"
      >
        Devtools ↗
      </a>
    </nav>
  </header>
</template>
