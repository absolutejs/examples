<script setup lang="ts">
import { ref, onUnmounted } from "vue";

const racing = ref(false);
const workerTime = ref(0);
const mainTime = ref(0);
const stressing = ref(false);
let timerWorker: Worker | null = null;
let mainInterval: ReturnType<typeof setInterval> | null = null;

onUnmounted(() => {
  timerWorker?.terminate();
  if (mainInterval) clearInterval(mainInterval);
});

function startRace() {
  racing.value = true;
  workerTime.value = 0;
  mainTime.value = 0;

  const worker = new Worker(
    new URL("../../workers/timer.worker.ts", import.meta.url),
    { type: "module" },
  );
  worker.onmessage = (event: MessageEvent<{ elapsed: number }>) => {
    workerTime.value = event.data.elapsed;
  };
  worker.postMessage({ command: "start" });
  timerWorker = worker;

  let mainElapsed = 0;
  mainInterval = setInterval(() => {
    mainElapsed += 100;
    mainTime.value = mainElapsed;
  }, 100);
}

function stopRace() {
  racing.value = false;
  timerWorker?.postMessage({ command: "stop" });
  timerWorker?.terminate();
  timerWorker = null;
  if (mainInterval) clearInterval(mainInterval);
  mainInterval = null;
}

function stressMainThread() {
  if (stressing.value) return;
  stressing.value = true;
  const duration = 8000;
  const start = Date.now();
  function heavyChunk() {
    const chunkEnd = Date.now() + 200;
    while (Date.now() < chunkEnd) {
      Math.sqrt(Math.random() * 999999);
    }
    if (Date.now() - start < duration) {
      setTimeout(heavyChunk, 5);
    } else {
      stressing.value = false;
    }
  }
  heavyChunk();
}

function formatTime(ms: number) {
  return (ms / 1000).toFixed(1) + "s";
}
</script>

<template>
  <div class="worker-card">
    <div class="card-title">Thread Race</div>
    <p class="card-desc">Worker and main thread timers side by side.</p>
    <div class="race-bars">
      <div class="race-bar-row">
        <div class="race-bar-label">
          <span>Worker Timer</span>
          <span>{{ formatTime(workerTime) }}</span>
        </div>
        <div class="race-bar-track">
          <div
            class="race-bar-fill worker"
            :style="{
              width: `${Math.min((workerTime / 10000) * 100, 100)}%`,
            }"
          ></div>
        </div>
      </div>
      <div class="race-bar-row">
        <div class="race-bar-label">
          <span>Main Thread</span>
          <span>{{ formatTime(mainTime) }}</span>
        </div>
        <div class="race-bar-track">
          <div
            class="race-bar-fill main-thread"
            :style="{
              width: `${Math.min((mainTime / 10000) * 100, 100)}%`,
            }"
          ></div>
        </div>
      </div>
    </div>
    <div class="race-controls">
      <button @click="startRace" :disabled="racing">Start Race</button>
      <button @click="stopRace" :disabled="!racing">Stop Race</button>
      <button
        class="stress"
        @click="stressMainThread"
        :disabled="stressing || !racing"
      >
        {{ stressing ? "Stressing..." : "Stress Main Thread" }}
      </button>
    </div>
  </div>
</template>
