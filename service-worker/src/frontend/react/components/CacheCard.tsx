import { useCallback, useEffect, useState } from "react";
import { DEMO_CACHE_URLS } from "../../constants";

export const CacheCard = ({ swReady }: { swReady: boolean }) => {
  const [cachedUrls, setCachedUrls] = useState<string[]>([]);
  const [caching, setCaching] = useState(false);

  const refreshCacheList = useCallback(() => {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return;
    const handler = (event: MessageEvent) => {
      if (event.data.type !== "cache-keys") return;

      setCachedUrls(event.data.urls);
      navigator.serviceWorker.removeEventListener("message", handler);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    worker.postMessage({ type: "get-cache-keys" });
  }, []);

  useEffect(() => {
    if (swReady) refreshCacheList();
  }, [swReady, refreshCacheList]);

  const cacheAll = useCallback(() => {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return;
    setCaching(true);
    let completed = 0;
    const handler = (event: MessageEvent) => {
      if (
        event.data.type !== "cache-url-done" &&
        event.data.type !== "cache-url-error"
      ) {
        return;
      }

      completed++;
      if (completed < DEMO_CACHE_URLS.length) return;

      setCaching(false);
      refreshCacheList();
      navigator.serviceWorker.removeEventListener("message", handler);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    for (const url of DEMO_CACHE_URLS) {
      worker.postMessage({ type: "cache-url", url });
    }
  }, [refreshCacheList]);

  const deleteFromCache = useCallback(
    (url: string) => {
      const worker = navigator.serviceWorker?.controller;
      if (!worker) return;
      const handler = (event: MessageEvent) => {
        if (event.data.type !== "delete-cache-done") return;

        refreshCacheList();
        navigator.serviceWorker.removeEventListener("message", handler);
      };
      navigator.serviceWorker.addEventListener("message", handler);
      worker.postMessage({ type: "delete-cache", url });
    },
    [refreshCacheList],
  );

  const clearAll = useCallback(() => {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return;
    const handler = (event: MessageEvent) => {
      if (event.data.type !== "clear-cache-done") return;

      refreshCacheList();
      navigator.serviceWorker.removeEventListener("message", handler);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    worker.postMessage({ type: "clear-cache" });
  }, [refreshCacheList]);

  const shortenUrl = (url: string) => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  };

  return (
    <div className="sw-card">
      <div className="card-title">Cache Storage</div>
      <p className="card-desc">
        Cache framework logos and manage cached resources.
      </p>
      <div className="btn-row">
        <button
          className={caching ? "loading" : ""}
          disabled={!swReady || caching}
          onClick={cacheAll}
        >
          {caching ? "Caching" : "Cache Logos"}
        </button>
        <button
          className="danger"
          disabled={!swReady || cachedUrls.length === 0}
          onClick={clearAll}
        >
          Clear All
        </button>
      </div>
      <div className="sw-result">
        <div className="result-row">
          <span>Cached</span>
          <span>{cachedUrls.length} items</span>
        </div>
      </div>
      {cachedUrls.length > 0 && (
        <div className="cache-list">
          {cachedUrls.map((url) => (
            <div className="cache-item" key={url}>
              <span>{shortenUrl(url)}</span>
              <button onClick={() => deleteFromCache(url)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
