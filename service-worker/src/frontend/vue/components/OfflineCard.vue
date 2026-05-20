<script setup lang="ts">
import { ref } from "vue";

defineProps<{ swReady: boolean }>();

type OfflineResult = {
  url: string;
  ok: boolean;
  status: number;
};

const CACHED_URL = "/assets/png/absolutejs-temp.png";

const testing = ref(false);
const results = ref<OfflineResult[]>([]);
const online = ref(navigator.onLine);

async function testOffline() {
  testing.value = true;
  online.value = navigator.onLine;
  const newResults: OfflineResult[] = [];

  const uncachedUrl = `/assets/svg/react.svg?nocache=${Date.now()}`;
  for (const url of [CACHED_URL, uncachedUrl]) {
    try {
      const response = await fetch(url);
      newResults.push({
        url: url.split("/").pop() ?? url,
        ok: response.ok,
        status: response.status,
      });
    } catch {
      newResults.push({
        url: url.split("/").pop() ?? url,
        ok: false,
        status: 0,
      });
    }
  }

  results.value = newResults;
  testing.value = false;
}
</script>

<template>
  <div class="sw-card">
    <div class="card-title">Offline Test</div>
    <p class="card-desc">Test cached vs uncached resources when offline.</p>
    <div :class="['status-badge', online ? 'active' : 'inactive']">
      <span class="dot"></span>
      {{ online ? "Online" : "Offline" }}
    </div>
    <button
      :class="{ loading: testing }"
      :disabled="!swReady || testing"
      @click="testOffline"
    >
      {{ testing ? "Testing" : "Test Resources" }}
    </button>
    <div v-if="results.length > 0" class="sw-result">
      <div v-for="r in results" :key="r.url" class="result-row">
        <span>{{ r.url }}</span>
        <span>{{ r.ok ? `OK (${r.status})` : `FAIL (${r.status})` }}</span>
      </div>
    </div>
  </div>
</template>
