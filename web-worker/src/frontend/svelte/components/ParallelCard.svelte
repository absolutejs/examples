<script lang="ts">
  import {
    PARALLEL_DIFFICULTIES,
    PARALLEL_WORKER_COUNT,
    PERCENTAGE_FULL,
  } from "../../constants";

  const difficulties = PARALLEL_DIFFICULTIES;
  const workerLabels = ["240K primes", "480K primes", "880K primes"];
  let parallelLoading = $state(false);
  let parallelResetting = $state(false);
  let parallelWorkers = $state([
    { percent: 0, elapsed: 0, done: false },
    { percent: 0, elapsed: 0, done: false },
    { percent: 0, elapsed: 0, done: false },
  ]);
  let parallelWorkerRefs: Worker[] = [];

  function runParallelRace() {
    for (const w of parallelWorkerRefs) w.terminate();
    parallelWorkerRefs = [];

    parallelResetting = true;
    parallelLoading = true;
    parallelWorkers = [
      { percent: 0, elapsed: 0, done: false },
      { percent: 0, elapsed: 0, done: false },
      { percent: 0, elapsed: 0, done: false },
    ];

    requestAnimationFrame(() => {
      parallelResetting = false;
      let completedCount = 0;

      for (let i = 0; i < PARALLEL_WORKER_COUNT; i++) {
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
          const entry = parallelWorkers[id];
          if (entry) {
            entry.percent = percent;
            entry.elapsed = elapsed;
            entry.done = percent >= PERCENTAGE_FULL;
          }
          if (percent >= PERCENTAGE_FULL) {
            completedCount++;
            worker.terminate();
            if (completedCount >= PARALLEL_WORKER_COUNT)
              parallelLoading = false;
          }
        };
        worker.postMessage({ id: i, difficulty: difficulties[i] });
      }
    }); // end requestAnimationFrame
  }
</script>

<div class="worker-card">
  <div class="card-title">Parallel Race</div>
  <p class="card-desc">
    3 workers with different workloads running simultaneously.
  </p>
  <button
    onclick={runParallelRace}
    class:loading={parallelLoading}
    disabled={parallelLoading}
  >
    {parallelLoading ? "Racing" : "Start Race"}
  </button>
  <div class="parallel-workers">
    {#each parallelWorkers as w, i}
      <div class="parallel-worker">
        <div class="parallel-worker-header">
          <span>{workerLabels[i]}</span>
          <span>{w.elapsed > 0 ? `${w.elapsed}ms` : ""}</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            class:done={w.done}
            style="width: {w.percent}%; {parallelResetting
              ? 'transition: none'
              : ''}"
          ></div>
        </div>
      </div>
    {/each}
  </div>
</div>
