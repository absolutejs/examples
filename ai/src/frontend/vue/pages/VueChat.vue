<script setup lang="ts">
import { ref } from "vue";
import Chat from "../components/Chat.vue";

const chatRef = ref<InstanceType<typeof Chat> | null>(null);

const toggleSidebar = () => {
  if (chatRef.value) {
    chatRef.value.sidebarOpen = !chatRef.value.sidebarOpen;
  }
};
</script>

<template>
  <header>
    <div class="header-left">
      <button
        class="sidebar-toggle"
        :title="chatRef?.sidebarOpen ? 'Close sidebar' : 'Open sidebar'"
        type="button"
        @click="toggleSidebar"
      >
        <svg
          fill="none"
          height="16"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="16"
        >
          <rect height="18" rx="2" width="18" x="3" y="3" />
          <line x1="9" x2="9" y1="3" y2="21" />
        </svg>
      </button>
      <a class="logo" href="/">
        <img
          alt="AbsoluteJS"
          height="24"
          src="/assets/png/absolutejs-temp.png"
        />
        AbsoluteJS
      </a>
    </div>
    <nav>
      <a href="/">React</a>
      <a href="/svelte">Svelte</a>
      <a class="active" href="/vue">Vue</a>
      <a href="/angular">Angular</a>
      <a href="/html">HTML</a>
      <a href="/htmx">HTMX</a>
    </nav>
  </header>
  <Chat ref="chatRef" />
</template>
