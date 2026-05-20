<script setup lang="ts">
import { ref } from "vue";

const hashResult = ref<{ hash: string; input: string } | null>(null);
const hashLoading = ref(false);

function runHash() {
  hashLoading.value = true;
  const worker = new Worker(
    new URL("../../workers/hash.worker.ts", import.meta.url),
    { type: "module" },
  );
  worker.onmessage = (event: MessageEvent<{ hash: string; input: string }>) => {
    hashResult.value = event.data;
    hashLoading.value = false;
    worker.terminate();
  };
  worker.postMessage({ text: "Hello, World!" });
}
</script>

<template>
  <div class="worker-card">
    <div class="card-title">SHA-256 Hash</div>
    <p class="card-desc">Offload cryptographic hashing to a worker thread.</p>
    <button
      @click="runHash"
      :class="{ loading: hashLoading }"
      :disabled="hashLoading"
    >
      {{ hashLoading ? "Computing" : "Compute Hash" }}
    </button>
    <div class="worker-result">
      <div class="result-row">
        <span>Input</span
        ><span>{{ hashResult ? hashResult.input : "\u2014" }}</span>
      </div>
      <div class="result-row">
        <span>Hash</span
        ><span>{{
          hashResult ? `${hashResult.hash.slice(0, 16)}...` : "\u2014"
        }}</span>
      </div>
    </div>
  </div>
</template>
