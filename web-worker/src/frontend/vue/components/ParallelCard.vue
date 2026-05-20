<script setup lang="ts">
import { ref } from "vue";

const difficulties = [3, 6, 11];
const workerLabels = ["240K primes", "480K primes", "880K primes"];
const parallelLoading = ref(false);
const parallelWorkers = ref([
  { percent: 0, elapsed: 0, done: false },
  { percent: 0, elapsed: 0, done: false },
  { percent: 0, elapsed: 0, done: false },
]);
let parallelWorkerRefs: Worker[] = [];
const parallelResetting = ref(false);

function runParallelRace() {
  for (const w of parallelWorkerRefs) w.terminate();
  parallelWorkerRefs = [];

  parallelResetting.value = true;
  parallelLoading.value = true;
  parallelWorkers.value = [
    { percent: 0, elapsed: 0, done: false },
    { percent: 0, elapsed: 0, done: false },
    { percent: 0, elapsed: 0, done: false },
  ];

  requestAnimationFrame(() => {
    parallelResetting.value = false;
    let completedCount = 0;

    for (let i = 0; i < 3; i++) {
      const worker = new Worker(
        new URL("../../workers/parallel.worker.ts", import.meta.url),
        { type: "module" },
      );
      parallelWorkerRefs.push(worker);
      worker.onmessage = (
        event: MessageEvent<{
          id: number;
          percent: number;
          elapsed: number;
          totalDuration?: number;
        }>,
      ) => {
        const { id, percent, elapsed } = event.data;
        const entry = parallelWorkers.value[id];
        if (entry) {
          entry.percent = percent;
          entry.elapsed = elapsed;
          entry.done = percent >= 100;
        }
        if (percent >= 100) {
          completedCount++;
          worker.terminate();
          if (completedCount >= 3) parallelLoading.value = false;
        }
      };
      worker.postMessage({ id: i, difficulty: difficulties[i] });
    }
  }); // end requestAnimationFrame
}
</script>

<template>
  <div class="worker-card">
    <div class="card-title">Parallel Race</div>
    <p class="card-desc">
      3 workers with different workloads running simultaneously.
    </p>
    <button
      @click="runParallelRace"
      :class="{ loading: parallelLoading }"
      :disabled="parallelLoading"
    >
      {{ parallelLoading ? "Racing" : "Start Race" }}
    </button>
    <div class="parallel-workers">
      <div v-for="(w, i) in parallelWorkers" :key="i" class="parallel-worker">
        <div class="parallel-worker-header">
          <span>{{ workerLabels[i] }}</span>
          <span>{{ w.elapsed > 0 ? `${w.elapsed}ms` : "" }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :class="{ done: w.done }"
            :style="{
              width: `${w.percent}%`,
              transition: parallelResetting ? 'none' : '',
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
