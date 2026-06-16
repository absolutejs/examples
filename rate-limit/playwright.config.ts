import { defineConfig } from "@playwright/test";

const port = process.env.PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests",
  outputDir: "node_modules/.cache/playwright",
  timeout: 30000,
  reporter: [["list"]],
  workers: 1,
  retries: 2,
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
    command: "absolute start",
    env: { PORT: port },
    reuseExistingServer: true,
    timeout: 180000,
    url: baseURL,
  },
});
