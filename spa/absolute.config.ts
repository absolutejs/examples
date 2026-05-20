import { defineConfig } from "@absolutejs/absolute";

export default defineConfig({
  angularDirectory: "./src/frontend/angular",
  assetsDirectory: "./src/backend/assets",
  buildDirectory: "./build",
  reactDirectory: "./src/frontend/react",
  stylesConfig: "./src/frontend/styles/indexes",
  svelteDirectory: "./src/frontend/svelte",
  vueDirectory: "./src/frontend/vue",
});
