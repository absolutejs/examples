import { ChangeDetectorRef, Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DEMO_CACHE_URLS, PING_COUNT, SW_STATES } from "../../constants";

type SwState = "unsupported" | "unregistered" | "registering" | "active";
type PingResult = { index: number; latency: number };
type FetchResult = {
  url: string;
  source: string;
  status: number;
  duration: number;
};
type OfflineResult = { url: string; ok: boolean; status: number };

const STATE_ORDER: Record<string, number> = {
  activated: 3,
  activating: 2,
  installed: 1,
  installing: 0,
  redundant: 4,
};

const TEST_URLS = [
  "/assets/svg/react.svg",
  "/assets/png/absolutejs-temp.png",
  "/assets/ico/favicon.ico",
];

const PING_DELAY_MS = 200;
const CACHE_THRESHOLD_MS = 5;

const getBadgeClass = (state: SwState) => {
  if (state === "active") return "active";
  if (state === "registering") return "pending";

  return "inactive";
};

const getBadgeLabel = (state: SwState) => {
  if (state === "unsupported") return "Not Supported";
  if (state === "active") return "Active";
  if (state === "registering") return "Registering";

  return "Unregistered";
};

const detectFetchSource = (response: Response, duration: number) => {
  if (response.headers.get("x-sw-cache") === "true") return "cache";
  if (duration < CACHE_THRESHOLD_MS) return "cache (likely)";

  return "network";
};

const fetchUrl = async (url: string) => {
  const start = performance.now();
  try {
    const response = await fetch(url);
    const duration = Math.round(performance.now() - start);

    return {
      duration,
      source: detectFetchSource(response, duration),
      status: response.status,
      url: url.split("/").pop() ?? url,
    };
  } catch {
    const duration = Math.round(performance.now() - start);

    return {
      duration,
      source: "error",
      status: 0,
      url: url.split("/").pop() ?? url,
    };
  }
};

const testUrl = async (url: string) => {
  try {
    const response = await fetch(url);

    return {
      ok: response.ok,
      status: response.status,
      url: url.split("/").pop() ?? url,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      url: url.split("/").pop() ?? url,
    };
  }
};

const addReachedStates = (reachedStates: Set<string>, status: string) => {
  const order = STATE_ORDER[status];
  if (order === undefined) return;

  for (const [key, val] of Object.entries(STATE_ORDER)) {
    if (val <= order) reachedStates.add(key);
  }
};

@Component({
  imports: [CommonModule],
  selector: "angular-page",
  standalone: true,
  templateUrl: "../templates/angular-sw-demo.html",
})
export class AngularSwDemoComponent {
  // Registration
  swState: SwState = "unregistered";
  scope: string | null = null;
  scriptUrl: string | null = null;
  swReady = false;

  // Cache
  cachedUrls: string[] = [];
  caching = false;

  // Ping
  pinging = false;
  pingResults: PingResult[] = [];
  pingCount = PING_COUNT;

  // Fetch
  fetching = false;
  fetchResults: FetchResult[] = [];

  // Lifecycle
  swStates = SW_STATES;
  currentLifecycleState: string | null = null;
  reachedStates = new Set<string>();

  // Offline
  testing = false;
  offlineResults: OfflineResult[] = [];
  online = true;

  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.online = typeof navigator !== "undefined" ? navigator.onLine : true;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      this.swState = "unsupported";

      return;
    }

    this.checkExistingRegistration().catch(() => undefined);

    navigator.serviceWorker.addEventListener(
      "message",
      this.handleSwMessage.bind(this),
    );
  }

  ngOnDestroy() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.removeEventListener(
        "message",
        this.handleSwMessage.bind(this),
      );
    }
  }

  private async checkExistingRegistration() {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg?.active) return;

    this.swState = "active";
    this.scope = reg.scope;
    this.scriptUrl = reg.active.scriptURL;
    this.swReady = true;
    this.refreshCacheList();
    this.requestLifecycleStatus();
    this.cdr.detectChanges();
  }

  private handleSwMessage(event: MessageEvent) {
    if (event.data.type !== "sw-status") return;

    this.currentLifecycleState = event.data.status;
    addReachedStates(this.reachedStates, event.data.status);
    this.cdr.detectChanges();
  }

  private handleNewRegistration(reg: ServiceWorkerRegistration) {
    const worker = reg.active || reg.installing || reg.waiting;
    if (!worker) return;

    const activate = () => {
      this.swState = "active";
      this.scope = reg.scope;
      this.scriptUrl = worker.scriptURL;
      this.swReady = true;
      this.refreshCacheList();
      this.requestLifecycleStatus();
      this.cdr.detectChanges();
    };

    if (worker.state === "activated") {
      activate();

      return;
    }
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") activate();
    });
  }

  async register() {
    if (!("serviceWorker" in navigator)) return;
    this.swState = "registering";
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      this.handleNewRegistration(reg);
    } catch {
      this.swState = "unregistered";
      this.cdr.detectChanges();
    }
  }

  async unregister() {
    const reg = await navigator.serviceWorker
      .getRegistration()
      .catch(() => undefined);
    if (!reg) return;

    await reg.unregister().catch(() => undefined);
    this.swState = "unregistered";
    this.scope = null;
    this.scriptUrl = null;
    this.swReady = false;
    this.cdr.detectChanges();
  }

  private refreshCacheList() {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return;
    const handler = (event: MessageEvent) => {
      if (event.data.type !== "cache-keys") return;

      this.cachedUrls = event.data.urls;
      this.cdr.detectChanges();
      navigator.serviceWorker.removeEventListener("message", handler);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    worker.postMessage({ type: "get-cache-keys" });
  }

  private requestLifecycleStatus() {
    const worker = navigator.serviceWorker?.controller;
    if (worker) worker.postMessage({ type: "get-status" });
  }

  cacheAll() {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return;
    this.caching = true;
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

      this.caching = false;
      this.refreshCacheList();
      navigator.serviceWorker.removeEventListener("message", handler);
      this.cdr.detectChanges();
    };
    navigator.serviceWorker.addEventListener("message", handler);
    for (const url of DEMO_CACHE_URLS) {
      worker.postMessage({ type: "cache-url", url });
    }
  }

  deleteFromCache(url: string) {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return;
    const handler = (event: MessageEvent) => {
      if (event.data.type !== "delete-cache-done") return;

      this.refreshCacheList();
      navigator.serviceWorker.removeEventListener("message", handler);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    worker.postMessage({ type: "delete-cache", url });
  }

  clearCache() {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return;
    const handler = (event: MessageEvent) => {
      if (event.data.type !== "clear-cache-done") return;

      this.refreshCacheList();
      navigator.serviceWorker.removeEventListener("message", handler);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    worker.postMessage({ type: "clear-cache" });
  }

  runPing() {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return;
    this.pinging = true;
    this.pingResults = [];
    let count = 0;

    const sendPing = () => {
      const start = performance.now();
      const handler = (event: MessageEvent) => {
        if (event.data.type !== "pong") return;

        const latency = Math.round(performance.now() - start);
        count++;
        this.pingResults = [...this.pingResults, { index: count, latency }];
        this.cdr.detectChanges();
        navigator.serviceWorker.removeEventListener("message", handler);
        if (count >= PING_COUNT) {
          this.pinging = false;
          this.cdr.detectChanges();

          return;
        }
        setTimeout(sendPing, PING_DELAY_MS);
      };
      navigator.serviceWorker.addEventListener("message", handler);
      worker.postMessage({ type: "ping" });
    };

    sendPing();
  }

  async runFetchTest() {
    this.fetching = true;
    this.fetchResults = [];
    this.fetchResults = await Promise.all(TEST_URLS.map(fetchUrl));
    this.fetching = false;
    this.cdr.detectChanges();
  }

  async testOffline() {
    this.testing = true;
    this.online = navigator.onLine;
    this.offlineResults = [];

    const uncachedUrl = `/assets/svg/react.svg?nocache=${Date.now()}`;
    this.offlineResults = await Promise.all(
      ["/assets/png/absolutejs-temp.png", uncachedUrl].map(testUrl),
    );
    this.testing = false;
    this.cdr.detectChanges();
  }

  get badgeClass() {
    return getBadgeClass(this.swState);
  }

  get badgeLabel() {
    return getBadgeLabel(this.swState);
  }

  get avgPingLatency() {
    if (this.pingResults.length === 0) return null;

    return Math.round(
      this.pingResults.reduce((sum, result) => sum + result.latency, 0) /
        this.pingResults.length,
    );
  }

  shortenUrl(url: string) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  isLifecycleReached(state: string) {
    return this.reachedStates.has(state);
  }

  isLifecycleCurrent(state: string) {
    return this.currentLifecycleState === state;
  }
}

export const factory = () => new AngularSwDemoComponent();
