<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import {
  createSyncSubscriber,
  type SyncSubscriber,
} from "@absolutejs/sync/client";
import Nav from "../components/Nav.vue";

const count = ref(0);
const connected = ref(false);
let subscriber: SyncSubscriber | null = null;

onMounted(() => {
  void fetch("/api/state")
    .then((response) => response.json())
    .then((data: { count: number }) => {
      count.value = data.count;
    });

  subscriber = createSyncSubscriber({
    onError: () => {
      connected.value = false;
    },
    onEvent: (event) => {
      const payload = event.payload as { count?: number } | undefined;
      if (payload?.count !== undefined) {
        count.value = payload.count;
      }
    },
    onOpen: () => {
      connected.value = true;
    },
    topics: ["counter"],
    url: "/sync",
  });
});

onUnmounted(() => subscriber?.close());

const bump = () => {
  void fetch("/api/bump", { method: "POST" });
};
const reset = () => {
  void fetch("/api/reset", { method: "POST" });
};
</script>

<template>
  <div>
    <Nav />
    <main>
      <div class="page-title">
        <img alt="Vue" src="/assets/svg/vue-logo.svg" />
        <h1>Vue</h1>
        <span class="badge">@absolutejs/sync</span>
      </div>

      <p class="section-desc">
        This counter lives on the server. Each page subscribes to the
        <code>counter</code> topic over a single Server-Sent Events stream and
        re-renders the moment the value changes — no polling, no refresh.
      </p>

      <section class="sync-card">
        <div class="sync-status">
          <span :class="connected ? 'dot dot-live' : 'dot'" />
          {{ connected ? "Live — subscribed to /sync" : "Connecting…" }}
        </div>
        <div class="sync-count">{{ count }}</div>
        <div class="sync-actions">
          <button class="primary" type="button" @click="bump">
            Bump counter
          </button>
          <button type="button" @click="reset">Reset</button>
        </div>
      </section>

      <p class="section-desc">
        Open <code>/</code>, <code>/svelte</code>, <code>/angular</code>,
        <code>/html</code>, or <code>/htmx</code> in another tab and bump from
        any of them — every open client updates at once.
      </p>

      <p class="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
          >AbsoluteJS</a
        >
      </p>
    </main>
  </div>
</template>
