<script setup lang="ts">
import { FRAMEWORKS } from "../../../constants/navigation";
</script>

<template>
  <div class="voice-demo-page">
    <header>
      <a class="logo" href="/">
        <img
          alt="AbsoluteJS"
          height="24"
          src="/assets/png/absolutejs-temp.png"
        />
        AbsoluteJS
      </a>
      <nav>
        <a
          v-for="framework in FRAMEWORKS"
          :key="framework.id"
          :class="{ active: framework.id === 'vue' }"
          :href="framework.href"
        >
          {{ framework.label }}
        </a>
        <a href="/reviews">Reviews</a>
        <a href="/traces">Traces</a>
        <a href="/carriers">Carriers</a>
        <a href="/phone-agent">Phone Agent</a>
      </nav>
    </header>
    <main class="voice-shell">
      <section class="voice-grid">
        <slot></slot>
      </section>
      <p class="footer">
        <img src="/assets/png/absolutejs-temp.png" alt="" />
        Powered by
        <a
          href="https://absolutejs.com"
          target="_blank"
          rel="noopener noreferrer"
          >AbsoluteJS</a
        >
      </p>
    </main>
  </div>
</template>
