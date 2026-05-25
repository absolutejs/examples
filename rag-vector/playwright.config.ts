import { defineConfig } from "@playwright/test";

// E2E for the live "sync" RAG backend. The web server is the AbsoluteJS
// workspace booted headlessly (`absolute workspace dev --no-tui`), which also
// brings up the internal rag service (:3001) and a pgvector container — so
// Docker must be available. The web's readiness timeout is bumped in
// absolute.config.ts so a cold multi-framework build doesn't abort the boot.
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "node_modules/.cache/playwright",
  timeout: 60_000,
  reporter: [["list"]],
  workers: 1,
  retries: 3,
  use: {
    baseURL: "http://localhost:3000",
    // Stability flags for constrained containers/CI where Chromium otherwise
    // crashes mid-run ("Target page has been closed").
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
    command: "bun run dev -- --no-tui",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    // Cold-builds every framework + boots postgres/rag/web, so allow startup time.
    timeout: 240_000,
  },
});
