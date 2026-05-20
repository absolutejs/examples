<script setup lang="ts">
import { ref } from "vue";

defineProps<{ swReady: boolean }>();

type FetchResult = {
  url: string;
  source: string;
  status: number;
  duration: number;
};

const TEST_URLS = [
  "/assets/svg/react.svg",
  "/assets/png/absolutejs-temp.png",
  "/assets/ico/favicon.ico",
];

const fetching = ref(false);
const results = ref<FetchResult[]>([]);

async function runFetchTest() {
  fetching.value = true;
  results.value = [];
  const newResults: FetchResult[] = [];

  for (const url of TEST_URLS) {
    const start = performance.now();
    try {
      const response = await fetch(url);
      const duration = Math.round(performance.now() - start);
      const source =
        response.headers.get("x-sw-cache") === "true"
          ? "cache"
          : duration < 5
            ? "cache (likely)"
            : "network";
      newResults.push({
        url: url.split("/").pop() ?? url,
        source,
        status: response.status,
        duration,
      });
    } catch {
      const duration = Math.round(performance.now() - start);
      newResults.push({
        url: url.split("/").pop() ?? url,
        source: "error",
        status: 0,
        duration,
      });
    }
  }

  results.value = newResults;
  fetching.value = false;
}
</script>

<template>
  <div class="sw-card">
    <div class="card-title">Fetch Intercept</div>
    <p class="card-desc">
      Fetch resources and see if they come from cache or network.
    </p>
    <button
      :class="{ loading: fetching }"
      :disabled="!swReady || fetching"
      @click="runFetchTest"
    >
      {{ fetching ? "Fetching" : "Test Fetch" }}
    </button>
    <div v-if="results.length > 0" class="sw-result">
      <div v-for="r in results" :key="r.url" class="result-row">
        <span>{{ r.url }}</span>
        <span>{{ r.status }} {{ r.source }} {{ r.duration }}ms</span>
      </div>
    </div>
  </div>
</template>
