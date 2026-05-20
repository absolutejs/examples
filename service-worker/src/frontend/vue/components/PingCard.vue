<script setup lang="ts">
import { ref, computed } from "vue";
import { PING_COUNT } from "../../constants";

defineProps<{ swReady: boolean }>();

type PingResult = { index: number; latency: number };
const MAX_PING_MS = 50;

const pinging = ref(false);
const results = ref<PingResult[]>([]);

const avgLatency = computed(() =>
  results.value.length > 0
    ? Math.round(
        results.value.reduce((s, r) => s + r.latency, 0) / results.value.length,
      )
    : null,
);

function runPing() {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return;
  pinging.value = true;
  results.value = [];
  let count = 0;

  const sendPing = () => {
    const start = performance.now();
    const handler = (event: MessageEvent) => {
      if (event.data.type === "pong") {
        const latency = Math.round(performance.now() - start);
        count++;
        results.value = [...results.value, { index: count, latency }];
        navigator.serviceWorker.removeEventListener("message", handler);
        if (count < PING_COUNT) {
          setTimeout(sendPing, 200);
        } else {
          pinging.value = false;
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    sw.postMessage({ type: "ping" });
  };

  sendPing();
}
</script>

<template>
  <div class="sw-card">
    <div class="card-title">Message Channel</div>
    <p class="card-desc">
      Ping the service worker and measure round-trip latency.
    </p>
    <button
      :class="{ loading: pinging }"
      :disabled="!swReady || pinging"
      @click="runPing"
    >
      {{
        pinging
          ? `Pinging (${results.length}/${PING_COUNT})`
          : `Send ${PING_COUNT} Pings`
      }}
    </button>
    <div v-if="results.length > 0" class="ping-results">
      <div v-for="r in results" :key="r.index" class="ping-row">
        <div class="ping-bar-track">
          <div
            class="ping-bar-fill"
            :style="{
              width: `${Math.min((r.latency / MAX_PING_MS) * 100, 100)}%`,
            }"
          ></div>
        </div>
        <span class="ping-label">{{ r.latency }}ms</span>
      </div>
    </div>
    <div class="sw-result">
      <div class="result-row">
        <span>Avg Latency</span
        ><span>{{ avgLatency !== null ? `${avgLatency}ms` : "\u2014" }}</span>
      </div>
      <div class="result-row">
        <span>Pings</span><span>{{ results.length }} / {{ PING_COUNT }}</span>
      </div>
    </div>
  </div>
</template>
