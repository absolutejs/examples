<script lang="ts">
  import { PING_COUNT } from "../../constants";

  type PingCardProps = {
    swReady: boolean;
  };

  let { swReady }: PingCardProps = $props();

  type PingResult = { index: number; latency: number };
  const MAX_PING_MS = 50;

  let pinging = $state(false);
  let results = $state<PingResult[]>([]);

  let avgLatency = $derived(
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.latency, 0) / results.length)
      : null,
  );

  function runPing() {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;
    pinging = true;
    results = [];
    let count = 0;

    const sendPing = () => {
      const start = performance.now();
      const handler = (event: MessageEvent) => {
        if (event.data.type === "pong") {
          const latency = Math.round(performance.now() - start);
          count++;
          results = [...results, { index: count, latency }];
          navigator.serviceWorker.removeEventListener("message", handler);
          if (count < PING_COUNT) {
            setTimeout(sendPing, 200);
          } else {
            pinging = false;
          }
        }
      };
      navigator.serviceWorker.addEventListener("message", handler);
      sw.postMessage({ type: "ping" });
    };

    sendPing();
  }
</script>

<div class="sw-card">
  <div class="card-title">Message Channel</div>
  <p class="card-desc">
    Ping the service worker and measure round-trip latency.
  </p>
  <button
    class:loading={pinging}
    disabled={!swReady || pinging}
    onclick={runPing}
  >
    {pinging
      ? `Pinging (${results.length}/${PING_COUNT})`
      : `Send ${PING_COUNT} Pings`}
  </button>
  {#if results.length > 0}
    <div class="ping-results">
      {#each results as r}
        <div class="ping-row">
          <div class="ping-bar-track">
            <div
              class="ping-bar-fill"
              style="width: {Math.min((r.latency / MAX_PING_MS) * 100, 100)}%"
            ></div>
          </div>
          <span class="ping-label">{r.latency}ms</span>
        </div>
      {/each}
    </div>
  {/if}
  <div class="sw-result">
    <div class="result-row">
      <span>Avg Latency</span><span
        >{avgLatency !== null ? `${avgLatency}ms` : "\u2014"}</span
      >
    </div>
    <div class="result-row">
      <span>Pings</span><span>{results.length} / {PING_COUNT}</span>
    </div>
  </div>
</div>
