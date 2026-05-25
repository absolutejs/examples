import { defineConfig } from "@playwright/test";

// Honor PORT so the suite can dodge a busy :3000 (e.g. another `absolute` server
// already running locally); defaults to 3000 for CI. The command inherits PORT,
// and the pages derive the WS URL from window.location, so any port works.
const port = process.env.PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests",
  // Keep artifacts under node_modules/.cache so `absolute dev`'s file watcher
  // doesn't rebuild mid-run when Playwright writes them.
  outputDir: "node_modules/.cache/playwright",
  timeout: 30000,
  reporter: [["list"]],
  // The suite drives one shared, server-authoritative collection, so run serially
  // to keep mutations deterministic; retry to absorb occasional Chromium-in-CI
  // process crashes (the functional races are fixed via client-generated ids).
  workers: 1,
  retries: 3,
  use: {
    baseURL,
    // Stability flags for constrained containers/CI, where Chromium otherwise
    // crashes mid-run ("Target page has been closed"): write shared memory to
    // /tmp, skip the sandbox, and drop GPU/rasterizer work.
    launchOptions: {
      args: [
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-accelerated-2d-canvas",
      ],
    },
  },
  webServer: {
    // Production server (builds then serves) — no dev watcher/HMR, so page loads
    // stay stable under the suite's rapid sequential navigations.
    command: "absolute start",
    url: baseURL,
    env: { PORT: port },
    reuseExistingServer: true,
    // The command cold-builds every framework bundle first, so allow startup time.
    timeout: 180000,
  },
});
