<script lang="ts">
  type OfflineCardProps = {
    swReady: boolean;
  };

  let { swReady }: OfflineCardProps = $props();

  type OfflineResult = {
    url: string;
    ok: boolean;
    status: number;
  };

  const CACHED_URL = "/assets/png/absolutejs-temp.png";

  let testing = $state(false);
  let results = $state<OfflineResult[]>([]);
  let online = $state(navigator.onLine);

  async function testOffline() {
    testing = true;
    online = navigator.onLine;
    const newResults: OfflineResult[] = [];

    const uncachedUrl = `/assets/svg/react.svg?nocache=${Date.now()}`;
    for (const url of [CACHED_URL, uncachedUrl]) {
      try {
        const response = await fetch(url);
        newResults.push({
          url: url.split("/").pop() ?? url,
          ok: response.ok,
          status: response.status,
        });
      } catch {
        newResults.push({
          url: url.split("/").pop() ?? url,
          ok: false,
          status: 0,
        });
      }
    }

    results = newResults;
    testing = false;
  }
</script>

<div class="sw-card">
  <div class="card-title">Offline Test</div>
  <p class="card-desc">Test cached vs uncached resources when offline.</p>
  <div class="status-badge {online ? 'active' : 'inactive'}">
    <span class="dot"></span>
    {online ? "Online" : "Offline"}
  </div>
  <button
    class:loading={testing}
    disabled={!swReady || testing}
    onclick={testOffline}
  >
    {testing ? "Testing" : "Test Resources"}
  </button>
  {#if results.length > 0}
    <div class="sw-result">
      {#each results as r}
        <div class="result-row">
          <span>{r.url}</span>
          <span>{r.ok ? `OK (${r.status})` : `FAIL (${r.status})`}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
