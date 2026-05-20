<script lang="ts">
  let sortResult = $state<{
    size: number;
    min: number;
    max: number;
    median: number;
    duration: number;
  } | null>(null);
  let sortLoading = $state(false);

  function runSort() {
    sortLoading = true;
    const worker = new Worker(
      new URL("../../workers/sort.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (
      event: MessageEvent<{
        size: number;
        min: number;
        max: number;
        median: number;
        duration: number;
      }>,
    ) => {
      sortResult = event.data;
      sortLoading = false;
      worker.terminate();
    };
    worker.postMessage({ size: 1000000 });
  }
</script>

<div class="worker-card">
  <div class="card-title">Sort Array</div>
  <p class="card-desc">Data processing without blocking the UI.</p>
  <button onclick={runSort} class:loading={sortLoading} disabled={sortLoading}>
    {sortLoading ? "Sorting" : "Sort 1M Numbers"}
  </button>
  <div class="worker-result">
    <div class="result-row">
      <span>Min</span><span
        >{sortResult ? sortResult.min.toLocaleString() : "\u2014"}</span
      >
    </div>
    <div class="result-row">
      <span>Max</span><span
        >{sortResult ? sortResult.max.toLocaleString() : "\u2014"}</span
      >
    </div>
    <div class="result-row">
      <span>Median</span><span
        >{sortResult ? sortResult.median.toLocaleString() : "\u2014"}</span
      >
    </div>
    <div class="result-row">
      <span>Duration</span><span
        >{sortResult ? `${sortResult.duration}ms` : "\u2014"}</span
      >
    </div>
  </div>
</div>
