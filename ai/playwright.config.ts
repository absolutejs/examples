import { defineConfig } from "@playwright/test";

// Honor PORT so the suite can dodge a busy :3000 (e.g. another local server);
// defaults to 3000 for CI. The pages derive the WS URL from window.location.
const port = process.env.PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "node_modules/.cache/playwright",
  timeout: 60_000,
  reporter: [["list"]],
  workers: 1,
  retries: 3,
  use: {
    baseURL,
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
    // Production server (builds then serves). The mock provider is the default
    // model, so the chat works with no API key.
    command: "absolute start",
    url: baseURL,
    env: { PORT: port },
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
