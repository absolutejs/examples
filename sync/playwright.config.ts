import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  // Keep artifacts under node_modules/.cache so `absolute dev`'s file watcher
  // doesn't rebuild mid-run when Playwright writes them.
  outputDir: "node_modules/.cache/playwright",
  timeout: 30000,
  reporter: [["list"]],
  // The suite drives one shared, server-authoritative collection, so run serially
  // to keep mutations deterministic; retry to absorb the occasional pre-hydration
  // submit race.
  workers: 1,
  retries: 2,
  use: {
    baseURL: "http://localhost:3000",
    // Containers/CI give a tiny /dev/shm, which crashes Chromium ("Target page
    // has been closed"); write shared memory to /tmp and skip the sandbox instead.
    launchOptions: {
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    },
  },
  webServer: {
    // Production server (builds then serves) — no dev watcher/HMR, so page loads
    // stay stable under the suite's rapid sequential navigations.
    command: "absolute start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    // The command cold-builds every framework bundle first, so allow startup time.
    timeout: 180000,
  },
});
