import { test, expect } from "@playwright/test";

// Smoke test the rate-limit example end-to-end via HTTP. The page exists as
// a developer-facing demo; the actual contract under test is the server's
// rate-limit decisions and the IETF headers it emits.

test("info route returns 200 with RateLimit + RateLimit-Policy headers", async ({
  request,
}) => {
  const response = await request.get("/api/info");
  expect(response.status()).toBe(200);
  const combined = response.headers()["ratelimit"];
  expect(combined).toBeDefined();
  expect(combined).toContain("limit=");
  expect(combined).toContain("remaining=");
  expect(response.headers()["ratelimit-policy"]).toBeDefined();
});

test("burst eventually returns 429 with Retry-After", async ({ request }) => {
  let lastStatus = 200;
  let retryAfter: string | null = null;
  // GCRA burst=5, sustained=10/sec — 30 back-to-back is guaranteed to throttle.
  for (let i = 0; i < 30 && lastStatus !== 429; i++) {
    const response = await request.get("/api/info");
    lastStatus = response.status();
    retryAfter = response.headers()["retry-after"] ?? null;
  }
  expect(lastStatus).toBe(429);
  expect(retryAfter).not.toBeNull();
});

test("admin token skips the limit entirely", async ({ request }) => {
  // First burn through the budget without admin auth.
  for (let i = 0; i < 30; i++) {
    await request.get("/api/info");
  }
  // Admin can still get through.
  const response = await request.get("/api/info", {
    headers: { Authorization: "Bearer demo-admin-token" },
  });
  expect(response.status()).toBe(200);
});

test("page renders and shows the controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("@absolutejs/rate-limit")).toBeVisible();
  await expect(page.getByTestId("info-1")).toBeVisible();
  await expect(page.getByTestId("upload-1")).toBeVisible();
});
