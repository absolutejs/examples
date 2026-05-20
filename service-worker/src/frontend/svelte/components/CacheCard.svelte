<script lang="ts">
  import { DEMO_CACHE_URLS } from "../../constants";

  type CacheCardProps = {
    swReady: boolean;
  };

  let { swReady }: CacheCardProps = $props();
  let cachedUrls = $state<string[]>([]);
  let caching = $state(false);

  function refreshCacheList() {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;
    const handler = (event: MessageEvent) => {
      if (event.data.type === "cache-keys") {
        cachedUrls = event.data.urls;
        navigator.serviceWorker.removeEventListener("message", handler);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    sw.postMessage({ type: "get-cache-keys" });
  }

  $effect(() => {
    if (swReady) refreshCacheList();
  });

  function cacheAll() {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;
    caching = true;
    let completed = 0;
    const handler = (event: MessageEvent) => {
      if (
        event.data.type === "cache-url-done" ||
        event.data.type === "cache-url-error"
      ) {
        completed++;
        if (completed >= DEMO_CACHE_URLS.length) {
          caching = false;
          refreshCacheList();
          navigator.serviceWorker.removeEventListener("message", handler);
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    for (const url of DEMO_CACHE_URLS) {
      sw.postMessage({ type: "cache-url", url });
    }
  }

  function deleteFromCache(url: string) {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;
    const handler = (event: MessageEvent) => {
      if (event.data.type === "delete-cache-done") {
        refreshCacheList();
        navigator.serviceWorker.removeEventListener("message", handler);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    sw.postMessage({ type: "delete-cache", url });
  }

  function clearAll() {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;
    const handler = (event: MessageEvent) => {
      if (event.data.type === "clear-cache-done") {
        refreshCacheList();
        navigator.serviceWorker.removeEventListener("message", handler);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    sw.postMessage({ type: "clear-cache" });
  }

  function shortenUrl(url: string) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
</script>

<div class="sw-card">
  <div class="card-title">Cache Storage</div>
  <p class="card-desc">Cache framework logos and manage cached resources.</p>
  <div class="btn-row">
    <button
      class:loading={caching}
      disabled={!swReady || caching}
      onclick={cacheAll}
    >
      {caching ? "Caching" : "Cache Logos"}
    </button>
    <button
      class="danger"
      disabled={!swReady || cachedUrls.length === 0}
      onclick={clearAll}
    >
      Clear All
    </button>
  </div>
  <div class="sw-result">
    <div class="result-row">
      <span>Cached</span><span>{cachedUrls.length} items</span>
    </div>
  </div>
  {#if cachedUrls.length > 0}
    <div class="cache-list">
      {#each cachedUrls as url}
        <div class="cache-item">
          <span>{shortenUrl(url)}</span>
          <button onclick={() => deleteFromCache(url)}>Remove</button>
        </div>
      {/each}
    </div>
  {/if}
</div>
