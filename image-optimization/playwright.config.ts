import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 30000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "absolute dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
