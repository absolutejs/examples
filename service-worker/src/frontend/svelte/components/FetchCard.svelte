<script lang="ts">
  type FetchCardProps = {
    swReady: boolean;
  };

  let { swReady }: FetchCardProps = $props();

  type FetchResult = {
    url: string;
    source: string;
    status: number;
    duration: number;
  };

  const TEST_URLS = [
    "/assets/svg/react.svg",
    "/assets/png/absolutejs-temp.png",
    "/assets/ico/favicon.ico",
  ];

  let fetching = $state(false);
  let results = $state<FetchResult[]>([]);

  async function runFetchTest() {
    fetching = true;
    results = [];
    const newResults: FetchResult[] = [];

    for (const url of TEST_URLS) {
      const start = performance.now();
      try {
        const response = await fetch(url);
        const duration = Math.round(performance.now() - start);
        const source =
          response.headers.get("x-sw-cache") === "true"
            ? "cache"
            : duration < 5
              ? "cache (likely)"
              : "network";
        newResults.push({
          url: url.split("/").pop() ?? url,
          source,
          status: response.status,
          duration,
        });
      } catch {
        const duration = Math.round(performance.now() - start);
        newResults.push({
          url: url.split("/").pop() ?? url,
          source: "error",
          status: 0,
          duration,
        });
      }
    }

    results = newResults;
    fetching = false;
  }
</script>

<div class="sw-card">
  <div class="card-title">Fetch Intercept</div>
  <p class="card-desc">
    Fetch resources and see if they come from cache or network.
  </p>
  <button
    class:loading={fetching}
    disabled={!swReady || fetching}
    onclick={runFetchTest}
  >
    {fetching ? "Fetching" : "Test Fetch"}
  </button>
  {#if results.length > 0}
    <div class="sw-result">
      {#each results as r}
        <div class="result-row">
          <span>{r.url}</span>
          <span>{r.status} {r.source} {r.duration}ms</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
