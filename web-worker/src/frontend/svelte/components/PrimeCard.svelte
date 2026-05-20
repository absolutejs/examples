<script lang="ts">
  let primeResult = $state<{
    prime: number;
    n: number;
    duration: number;
  } | null>(null);
  let primeLoading = $state(false);

  function runPrime() {
    primeLoading = true;
    const worker = new Worker(
      new URL("../../workers/prime.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (
      event: MessageEvent<{ prime: number; n: number; duration: number }>,
    ) => {
      primeResult = event.data;
      primeLoading = false;
      worker.terminate();
    };
    worker.postMessage({ n: 10000 });
  }
</script>

<div class="worker-card">
  <div class="card-title">Prime Finder</div>
  <p class="card-desc">CPU-bound computation off the main thread.</p>
  <button
    onclick={runPrime}
    class:loading={primeLoading}
    disabled={primeLoading}
  >
    {primeLoading ? "Computing" : "Find 10,000th Prime"}
  </button>
  <div class="worker-result">
    <div class="result-row">
      <span>Prime #10000</span><span
        >{primeResult ? primeResult.prime.toLocaleString() : "\u2014"}</span
      >
    </div>
    <div class="result-row">
      <span>Duration</span><span
        >{primeResult ? `${primeResult.duration}ms` : "\u2014"}</span
      >
    </div>
  </div>
</div>
