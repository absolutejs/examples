<script setup lang="ts">
defineOptions({ name: "Nav" });

type Framework = "react" | "svelte" | "vue" | "angular" | "html" | "htmx";
type Mode = "raw" | "framework";

const props = defineProps<{
  activeFramework: Framework;
  activeMode?: Mode;
}>();

const mode = props.activeMode ?? "raw";
const rawFrameworkLinks = {
  react: "/",
  svelte: "/svelte",
  vue: "/vue",
  angular: "/angular",
  html: "/html",
  htmx: "/htmx",
};
const nativeFrameworkLinks = {
  react: "/react-framework",
  svelte: "/svelte-framework",
  vue: "/vue-framework",
  angular: "/angular-framework",
  html: "/html",
  htmx: "/htmx",
};
const isRawActive = (framework: Framework) =>
  mode === "raw" && props.activeFramework === framework;
const isFrameworkActive = (framework: Framework) =>
  mode === "framework" && props.activeFramework === framework;
</script>

<template>
  <header>
    <a href="/" class="logo">
      <img src="/assets/png/absolutejs-temp.png" height="24" alt="AbsoluteJS" />
      AbsoluteJS
    </a>
    <div class="nav-stack">
      <nav class="nav-row">
        <span class="nav-label">Raw Slots</span>
        <a
          :href="rawFrameworkLinks.react"
          :class="{ active: isRawActive('react') }"
          >React</a
        >
        <a
          :href="rawFrameworkLinks.svelte"
          :class="{ active: isRawActive('svelte') }"
          >Svelte</a
        >
        <a :href="rawFrameworkLinks.vue" :class="{ active: isRawActive('vue') }"
          >Vue</a
        >
        <a
          :href="rawFrameworkLinks.angular"
          :class="{ active: isRawActive('angular') }"
          >Angular</a
        >
        <a
          :href="rawFrameworkLinks.html"
          :class="{ active: isRawActive('html') }"
          >HTML</a
        >
        <a
          :href="rawFrameworkLinks.htmx"
          :class="{ active: isRawActive('htmx') }"
          >HTMX</a
        >
      </nav>
      <nav class="nav-row nav-row-secondary">
        <span class="nav-label">Framework Primitives</span>
        <a
          :href="nativeFrameworkLinks.react"
          :class="{ active: isFrameworkActive('react') }"
          >React</a
        >
        <a
          :href="nativeFrameworkLinks.svelte"
          :class="{ active: isFrameworkActive('svelte') }"
          >Svelte</a
        >
        <a
          :href="nativeFrameworkLinks.vue"
          :class="{ active: isFrameworkActive('vue') }"
          >Vue</a
        >
        <a
          :href="nativeFrameworkLinks.angular"
          :class="{ active: isFrameworkActive('angular') }"
          >Angular</a
        >
      </nav>
    </div>
  </header>
</template>
