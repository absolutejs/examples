<script setup lang="ts">
import { ref } from "vue";

const primeResult = ref<{ prime: number; n: number; duration: number } | null>(
  null,
);
const primeLoading = ref(false);

function runPrime() {
  primeLoading.value = true;
  const worker = new Worker(
    new URL("../../workers/prime.worker.ts", import.meta.url),
    { type: "module" },
  );
  worker.onmessage = (
    event: MessageEvent<{ prime: number; n: number; duration: number }>,
  ) => {
    primeResult.value = event.data;
    primeLoading.value = false;
    worker.terminate();
  };
  worker.postMessage({ n: 10000 });
}
</script>

<template>
  <div class="worker-card">
    <div class="card-title">Prime Finder</div>
    <p class="card-desc">CPU-bound computation off the main thread.</p>
    <button
      @click="runPrime"
      :class="{ loading: primeLoading }"
      :disabled="primeLoading"
    >
      {{ primeLoading ? "Computing" : "Find 10,000th Prime" }}
    </button>
    <div class="worker-result">
      <div class="result-row">
        <span>Prime #10000</span
        ><span>{{
          primeResult ? primeResult.prime.toLocaleString() : "\u2014"
        }}</span>
      </div>
      <div class="result-row">
        <span>Duration</span
        ><span>{{ primeResult ? `${primeResult.duration}ms` : "\u2014" }}</span>
      </div>
    </div>
  </div>
</template>
