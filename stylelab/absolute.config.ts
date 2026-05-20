import { defineConfig } from "@absolutejs/absolute";
import type { Root } from "postcss";

export default defineConfig({
  angularDirectory: "./src/frontend/angular",
  assetsDirectory: "./src/backend/assets",
  buildDirectory: "./build",
  htmlDirectory: "./src/frontend/html",
  htmxDirectory: "./src/frontend/htmx",
  postcss: {
    plugins: [
      {
        postcssPlugin: "stylelab-postcss-proof",
        Once(root: Root) {
          root.walkRules(".stylus-proof", (rule) => {
            rule.append({
              prop: "--postcss-proof",
              value: "enabled",
            });
          });
        },
      },
    ],
  },
  reactDirectory: "./src/frontend/react",
  stylePreprocessors: {
    less: {
      additionalData: "@accent: #0f766e;",
    },
    stylus: {
      additionalData: "stylusAccent = #7e22ce",
    },
  },
  stylesConfig: "./src/frontend/styles/indexes",
  svelteDirectory: "./src/frontend/svelte",
  tailwind: {
    input: "./src/frontend/styles/tailwind.css",
    output: "tailwind.css",
  },
  vueDirectory: "./src/frontend/vue",
});
