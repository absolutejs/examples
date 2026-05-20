import { DEMO_CACHE_URLS, PING_COUNT } from "../../constants";

const getElement = <T extends HTMLElement>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);

  return element;
};

// Registration elements
const badge = getElement<HTMLDivElement>("#sw-badge");
const badgeLabel = getElement<HTMLSpanElement>("#sw-badge-label");
const registerBtn = getElement<HTMLButtonElement>("#btn-register");
const unregisterBtn = getElement<HTMLButtonElement>("#btn-unregister");
const regScope = getElement<HTMLSpanElement>("#reg-scope");
const regScript = getElement<HTMLSpanElement>("#reg-script");

// Cache elements
const cacheBtn = getElement<HTMLButtonElement>("#btn-cache");
const clearCacheBtn = getElement<HTMLButtonElement>("#btn-clear-cache");
const cacheCount = getElement<HTMLSpanElement>("#cache-count");
const cacheList = getElement<HTMLDivElement>("#cache-list");

// Ping elements
const pingBtn = getElement<HTMLButtonElement>("#btn-ping");
const pingResultsDiv = getElement<HTMLDivElement>("#ping-results");
const pingAvg = getElement<HTMLSpanElement>("#ping-avg");
const pingCountEl = getElement<HTMLSpanElement>("#ping-count");

// Fetch elements
const fetchBtn = getElement<HTMLButtonElement>("#btn-fetch");
const fetchResultsDiv = getElement<HTMLDivElement>("#fetch-results");

// Lifecycle elements
const lcCurrent = getElement<HTMLSpanElement>("#lc-current");

// Offline elements
const onlineBadge = getElement<HTMLDivElement>("#online-badge");
const onlineLabel = getElement<HTMLSpanElement>("#online-label");
const offlineBtn = getElement<HTMLButtonElement>("#btn-offline");
const offlineResultsDiv = getElement<HTMLDivElement>("#offline-results");

const STATE_ORDER: Record<string, number> = {
  activated: 3,
  activating: 2,
  installed: 1,
  installing: 0,
  redundant: 4,
};

const PING_DELAY_MS = 200;
const PING_BAR_MAX_MS = 50;
const PERCENT = 100;
const CACHE_THRESHOLD_MS = 5;

const FETCH_TEST_URLS = [
  "/assets/svg/react.svg",
  "/assets/png/absolutejs-temp.png",
  "/assets/ico/favicon.ico",
];

const setSwReady = (ready: boolean) => {
  cacheBtn.disabled = !ready;
  pingBtn.disabled = !ready;
  fetchBtn.disabled = !ready;
  offlineBtn.disabled = !ready;
};

const getBadgeClass = (state: string) => {
  if (state === "active") return "active";
  if (state === "registering") return "pending";

  return "inactive";
};

const getBadgeLabelText = (state: string) => {
  if (state === "active") return "Active";
  if (state === "registering") return "Registering";

  return "Unregistered";
};

const updateBadge = (state: string) => {
  badge.className = `status-badge ${getBadgeClass(state)}`;
  badgeLabel.textContent = getBadgeLabelText(state);
};

const updateLifecycleStep = (
  key: string,
  val: number,
  status: string,
  order: number,
) => {
  const dot = document.querySelector<HTMLDivElement>(`#lc-dot-${key}`);
  const label = document.querySelector<HTMLSpanElement>(`#lc-label-${key}`);
  if (!dot || !label) return;
  if (key === status) {
    dot.className = "lifecycle-dot current";
    label.className = "lifecycle-label current";
  } else if (val <= order) {
    dot.className = "lifecycle-dot reached";
    label.className = "lifecycle-label reached";
  }
};

const updateLifecycle = (status: string) => {
  lcCurrent.textContent = status;
  const order = STATE_ORDER[status];
  if (order === undefined) return;
  for (const [key, val] of Object.entries(STATE_ORDER)) {
    updateLifecycleStep(key, val, status, order);
  }
};

const requestLifecycleStatus = () => {
  const worker = navigator.serviceWorker?.controller;
  if (worker) worker.postMessage({ type: "get-status" });
};

const deleteFromCache = (url: string) => {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return;
  const handler = (event: MessageEvent) => {
    if (event.data.type !== "delete-cache-done") return;

    refreshCacheList();
    navigator.serviceWorker.removeEventListener("message", handler);
  };
  navigator.serviceWorker.addEventListener("message", handler);
  worker.postMessage({ type: "delete-cache", url });
};

const refreshCacheList = () => {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return;
  const handler = (event: MessageEvent) => {
    if (event.data.type !== "cache-keys") return;

    const { urls } = event.data;
    cacheCount.textContent = `${urls.length} items`;
    clearCacheBtn.disabled = urls.length === 0;
    cacheList.innerHTML = urls
      .map((url: string) => {
        let path: string;
        try {
          path = new URL(url).pathname;
        } catch {
          path = url;
        }

        return `<div class="cache-item"><span>${path}</span><button data-url="${url}">Remove</button></div>`;
      })
      .join("");
    // Add click handlers
    cacheList
      .querySelectorAll<HTMLButtonElement>("button[data-url]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const delUrl = btn.getAttribute("data-url");
          if (delUrl) deleteFromCache(delUrl);
        });
      });
    navigator.serviceWorker.removeEventListener("message", handler);
  };
  navigator.serviceWorker.addEventListener("message", handler);
  worker.postMessage({ type: "get-cache-keys" });
};

const setRegistered = (reg: ServiceWorkerRegistration) => {
  const worker = reg.active;
  updateBadge("active");
  regScope.textContent = reg.scope;
  regScript.textContent = worker?.scriptURL.split("/").pop() ?? "\u2014";
  registerBtn.disabled = true;
  unregisterBtn.disabled = false;
  setSwReady(true);
  refreshCacheList();
  requestLifecycleStatus();
};

const setUnregistered = () => {
  updateBadge("unregistered");
  regScope.textContent = "\u2014";
  regScript.textContent = "\u2014";
  registerBtn.disabled = false;
  unregisterBtn.disabled = true;
  setSwReady(false);
};

const handleNewRegistration = (reg: ServiceWorkerRegistration) => {
  const worker = reg.active || reg.installing || reg.waiting;
  if (!worker) return;

  if (worker.state === "activated") {
    setRegistered(reg);

    return;
  }
  worker.addEventListener("statechange", () => {
    if (worker.state === "activated") setRegistered(reg);
  });
};

const detectFetchSource = (response: Response, duration: number) => {
  if (response.headers.get("x-sw-cache") === "true") return "cache";
  if (duration < CACHE_THRESHOLD_MS) return "cache (likely)";

  return "network";
};

const fetchSingleUrl = async (url: string) => {
  const start = performance.now();
  try {
    const response = await fetch(url);
    const duration = Math.round(performance.now() - start);
    const source = detectFetchSource(response, duration);

    return {
      duration,
      source,
      status: response.status,
      url: url.split("/").pop(),
    };
  } catch {
    const duration = Math.round(performance.now() - start);

    return { duration, source: "error", status: 0, url: url.split("/").pop() };
  }
};

const testSingleUrl = async (url: string) => {
  try {
    const response = await fetch(url);

    return {
      ok: response.ok,
      status: response.status,
      url: url.split("/").pop(),
    };
  } catch {
    return { ok: false, status: 0, url: url.split("/").pop() };
  }
};

// Global SW message handler
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "sw-status") {
      updateLifecycle(event.data.status);
    }
  });

  // Check for existing registration
  navigator.serviceWorker
    .getRegistration()
    .then((reg) => {
      if (reg?.active) setRegistered(reg);

      return undefined;
    })
    .catch(() => undefined);
}

registerBtn.addEventListener("click", async () => {
  if (!("serviceWorker" in navigator)) return;
  updateBadge("registering");
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    handleNewRegistration(reg);
  } catch {
    setUnregistered();
  }
});

unregisterBtn.addEventListener("click", async () => {
  const reg = await navigator.serviceWorker
    .getRegistration()
    .catch(() => undefined);
  if (!reg) return;

  await reg.unregister().catch(() => undefined);
  setUnregistered();
});

// Cache
cacheBtn.addEventListener("click", () => {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return;
  cacheBtn.classList.add("loading");
  cacheBtn.disabled = true;
  cacheBtn.textContent = "Caching";
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

    cacheBtn.classList.remove("loading");
    cacheBtn.disabled = false;
    cacheBtn.textContent = "Cache Logos";
    refreshCacheList();
    navigator.serviceWorker.removeEventListener("message", handler);
  };
  navigator.serviceWorker.addEventListener("message", handler);
  for (const url of DEMO_CACHE_URLS) {
    worker.postMessage({ type: "cache-url", url });
  }
});

clearCacheBtn.addEventListener("click", () => {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return;
  const handler = (event: MessageEvent) => {
    if (event.data.type !== "clear-cache-done") return;

    refreshCacheList();
    navigator.serviceWorker.removeEventListener("message", handler);
  };
  navigator.serviceWorker.addEventListener("message", handler);
  worker.postMessage({ type: "clear-cache" });
});

// Ping
pingBtn.addEventListener("click", () => {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return;
  pingBtn.classList.add("loading");
  pingBtn.disabled = true;
  pingResultsDiv.innerHTML = "";
  const results: number[] = [];
  let count = 0;

  const sendPing = () => {
    const start = performance.now();
    const handler = (event: MessageEvent) => {
      if (event.data.type !== "pong") return;

      const latency = Math.round(performance.now() - start);
      count++;
      results.push(latency);

      pingResultsDiv.innerHTML += `<div class="ping-row"><div class="ping-bar-track"><div class="ping-bar-fill" style="width: ${Math.min((latency / PING_BAR_MAX_MS) * PERCENT, PERCENT)}%"></div></div><span class="ping-label">${latency}ms</span></div>`;
      pingCountEl.textContent = `${count} / ${PING_COUNT}`;
      pingBtn.textContent = `Pinging (${count}/${PING_COUNT})`;

      const avg = Math.round(
        results.reduce((sum, val) => sum + val, 0) / results.length,
      );
      pingAvg.textContent = `${avg}ms`;

      navigator.serviceWorker.removeEventListener("message", handler);
      if (count >= PING_COUNT) {
        pingBtn.classList.remove("loading");
        pingBtn.disabled = false;
        pingBtn.textContent = `Send ${PING_COUNT} Pings`;

        return;
      }
      setTimeout(sendPing, PING_DELAY_MS);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    worker.postMessage({ type: "ping" });
  };

  sendPing();
});

// Fetch
fetchBtn.addEventListener("click", async () => {
  fetchBtn.classList.add("loading");
  fetchBtn.disabled = true;
  fetchBtn.textContent = "Fetching";
  fetchResultsDiv.style.display = "block";
  fetchResultsDiv.innerHTML = "";

  const results = await Promise.all(FETCH_TEST_URLS.map(fetchSingleUrl));
  for (const result of results) {
    fetchResultsDiv.innerHTML += `<div class="result-row"><span>${result.url}</span><span>${result.status} ${result.source} ${result.duration}ms</span></div>`;
  }

  fetchBtn.classList.remove("loading");
  fetchBtn.disabled = false;
  fetchBtn.textContent = "Test Fetch";
});

// Offline
offlineBtn.addEventListener("click", async () => {
  offlineBtn.classList.add("loading");
  offlineBtn.disabled = true;
  offlineBtn.textContent = "Testing";

  const isOnline = navigator.onLine;
  onlineBadge.className = `status-badge ${isOnline ? "active" : "inactive"}`;
  onlineLabel.textContent = isOnline ? "Online" : "Offline";

  offlineResultsDiv.style.display = "block";
  offlineResultsDiv.innerHTML = "";

  const uncachedUrl = `/assets/svg/react.svg?nocache=${Date.now()}`;
  const results = await Promise.all(
    ["/assets/png/absolutejs-temp.png", uncachedUrl].map(testSingleUrl),
  );
  for (const result of results) {
    offlineResultsDiv.innerHTML += `<div class="result-row"><span>${result.url}</span><span>${result.ok ? `OK (${result.status})` : `FAIL (${result.status})`}</span></div>`;
  }

  offlineBtn.classList.remove("loading");
  offlineBtn.disabled = false;
  offlineBtn.textContent = "Test Resources";
});
