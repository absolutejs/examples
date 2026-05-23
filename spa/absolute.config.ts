import { defineConfig } from "@absolutejs/absolute";
import { appProviders } from "./src/frontend/angular/appProviders";

export default defineConfig({
  angular: { providers: appProviders },
  angularDirectory: "./src/frontend/angular",
  assetsDirectory: "./src/backend/assets",
  buildDirectory: "./build",
  reactDirectory: "./src/frontend/react",
  stylesConfig: "./src/frontend/styles/indexes",
  svelteDirectory: "./src/frontend/svelte",
  vueDirectory: "./src/frontend/vue",
});
