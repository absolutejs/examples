<script lang="ts">
  import {
    MAIN_TIMER_INTERVAL_MS,
    MS_PER_SECOND,
    PERCENTAGE_FULL,
    RACE_BAR_MAX_MS,
    STRESS_CHUNK_MS,
    STRESS_RANDOM_MAX,
    STRESS_YIELD_MS,
  } from "../../constants";

  let racing = $state(false);
  let workerTime = $state(0);
  let mainTime = $state(0);
  let stressing = $state(false);
  let timerWorker: Worker | null = null;
  let mainInterval: ReturnType<typeof setInterval> | null = null;

  function startRace() {
    racing = true;
    workerTime = 0;
    mainTime = 0;

    const worker = new Worker(
      new URL("../../workers/timer.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<{ elapsed: number }>) => {
      workerTime = event.data.elapsed;
    };
    worker.postMessage({ command: "start" });
    timerWorker = worker;

    let mainElapsed = 0;
    mainInterval = setInterval(() => {
      mainElapsed += MAIN_TIMER_INTERVAL_MS;
      mainTime = mainElapsed;
    }, MAIN_TIMER_INTERVAL_MS);
  }

  function stopRace() {
    racing = false;
    timerWorker?.postMessage({ command: "stop" });
    timerWorker?.terminate();
    timerWorker = null;
    if (mainInterval) clearInterval(mainInterval);
    mainInterval = null;
  }

  function stressMainThread() {
    if (stressing) return;
    stressing = true;
    const duration = 8000;
    const start = Date.now();
    function heavyChunk() {
      const chunkEnd = Date.now() + STRESS_CHUNK_MS;
      while (Date.now() < chunkEnd) {
        Math.sqrt(Math.random() * STRESS_RANDOM_MAX);
      }
      if (Date.now() - start < duration) {
        setTimeout(heavyChunk, STRESS_YIELD_MS);
      } else {
        stressing = false;
      }
    }
    heavyChunk();
  }

  function formatTime(ms: number) {
    return (ms / MS_PER_SECOND).toFixed(1) + "s";
  }

  $effect(() => {
    return () => {
      timerWorker?.terminate();
      if (mainInterval) clearInterval(mainInterval);
    };
  });
</script>

<div class="worker-card">
  <div class="card-title">Thread Race</div>
  <p class="card-desc">Worker and main thread timers side by side.</p>
  <div class="race-bars">
    <div class="race-bar-row">
      <div class="race-bar-label">
        <span>Worker Timer</span>
        <span>{formatTime(workerTime)}</span>
      </div>
      <div class="race-bar-track">
        <div
          class="race-bar-fill worker"
          style="width: {Math.min(
            (workerTime / RACE_BAR_MAX_MS) * PERCENTAGE_FULL,
            PERCENTAGE_FULL,
          )}%"
        ></div>
      </div>
    </div>
    <div class="race-bar-row">
      <div class="race-bar-label">
        <span>Main Thread</span>
        <span>{formatTime(mainTime)}</span>
      </div>
      <div class="race-bar-track">
        <div
          class="race-bar-fill main-thread"
          style="width: {Math.min(
            (mainTime / RACE_BAR_MAX_MS) * PERCENTAGE_FULL,
            PERCENTAGE_FULL,
          )}%"
        ></div>
      </div>
    </div>
  </div>
  <div class="race-controls">
    <button onclick={startRace} disabled={racing}>Start Race</button>
    <button onclick={stopRace} disabled={!racing}>Stop Race</button>
    <button
      class="stress"
      onclick={stressMainThread}
      disabled={stressing || !racing}
    >
      {stressing ? "Stressing..." : "Stress Main Thread"}
    </button>
  </div>
</div>
