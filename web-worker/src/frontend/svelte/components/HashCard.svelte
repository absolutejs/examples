<script lang="ts">
  import { HASH_PREVIEW_LENGTH } from "../../constants";

  let hashResult = $state<{ hash: string; input: string } | null>(null);
  let hashLoading = $state(false);

  function runHash() {
    hashLoading = true;
    const worker = new Worker(
      new URL("../../workers/hash.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (
      event: MessageEvent<{ hash: string; input: string }>,
    ) => {
      hashResult = event.data;
      hashLoading = false;
      worker.terminate();
    };
    worker.postMessage({ text: "Hello, World!" });
  }
</script>

<div class="worker-card">
  <div class="card-title">SHA-256 Hash</div>
  <p class="card-desc">Offload cryptographic hashing to a worker thread.</p>
  <button onclick={runHash} class:loading={hashLoading} disabled={hashLoading}>
    {hashLoading ? "Computing" : "Compute Hash"}
  </button>
  <div class="worker-result">
    <div class="result-row">
      <span>Input</span><span>{hashResult ? hashResult.input : "\u2014"}</span>
    </div>
    <div class="result-row">
      <span>Hash</span><span
        >{hashResult
          ? `${hashResult.hash.slice(0, HASH_PREVIEW_LENGTH)}...`
          : "\u2014"}</span
      >
    </div>
  </div>
</div>
