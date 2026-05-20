import { defineConfig } from "@absolutejs/absolute";

export default defineConfig({
  angularDirectory: "./src/frontend/angular",
  assetsDirectory: "./src/backend/assets",
  buildDirectory: "./build",
  htmlDirectory: "./src/frontend/html",
  htmxDirectory: "./src/frontend/htmx",
  islands: {
    bootstrap: "./src/frontend/client/bootstrap.ts",
    registry: "./src/frontend/islands/registry.ts",
  },
  reactDirectory: "./src/frontend/react",
  stylesConfig: "./src/frontend/styles/indexes",
  svelteDirectory: "./src/frontend/svelte",
  vueDirectory: "./src/frontend/vue",
});
