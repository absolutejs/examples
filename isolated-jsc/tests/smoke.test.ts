import { expect, test } from "@playwright/test";

test("runs sandbox presets through the UI", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "@absolutejs/isolated-jsc" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText("heap-isolated JavaScriptCore sandbox"),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText("v2 will narrow host-globals further"),
  ).toHaveCount(0);

  const resultPanel = page.locator(".result");

  await page.getByRole("button", { exact: true, name: "Run" }).click();
  await expect(resultPanel.getByText(/OK .* ms/)).toBeVisible({
    timeout: 15000,
  });
  await expect(resultPanel.locator("pre.log")).toContainText(
    "hello from inside the sandbox",
    { timeout: 15000 },
  );
  await expect(resultPanel.getByText("capability manifest")).toBeVisible({
    timeout: 15000,
  });
  await expect(
    resultPanel.getByText(/"redactsInput": true/).first(),
  ).toBeVisible({
    timeout: 15000,
  });
  await expect(resultPanel.getByText("execution receipt")).toBeVisible({
    timeout: 15000,
  });
  await expect(
    resultPanel.getByRole("heading", { name: "policy recipe helpers" }),
  ).toBeVisible({
    timeout: 15000,
  });
  await expect(resultPanel.getByText("lookupOrder")).toHaveCount(0);
  await expect(resultPanel.getByText('"tool": "log"').first()).toBeVisible({
    timeout: 15000,
  });
  await expect(resultPanel.locator("pre.log")).toContainText(
    "captured console line",
    { timeout: 15000 },
  );
  await expect(resultPanel.getByText("2", { exact: true })).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole("button", { name: /Runaway loop/ }).click();
  await page.getByRole("button", { exact: true, name: "Run" }).click();
  await expect(resultPanel.locator(".result-status")).toContainText(
    "TimeoutError",
    {
      timeout: 10000,
    },
  );
  await expect(resultPanel.locator(".result-status")).toContainText(
    "Script exceeded",
    {
      timeout: 15000,
    },
  );

  await page.getByRole("button", { name: /No host filesystem access/ }).click();
  await page.getByRole("button", { exact: true, name: "Run" }).click();
  await expect(resultPanel.getByText(/OK .* ms/)).toBeVisible({
    timeout: 10000,
  });
  await expect(
    resultPanel.getByText("undefined,undefined,undefined"),
  ).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: /Result limit/ }).click();
  await page.getByRole("button", { exact: true, name: "Run" }).click();
  await expect(resultPanel.locator(".result-status")).toContainText(
    "ResultSizeError",
    { timeout: 15000 },
  );
  await expect(resultPanel.getByText(/RESULT_SIZE_LIMIT/).first()).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole("button", { name: /Capability output limit/ }).click();
  await page.getByRole("button", { exact: true, name: "Run" }).click();
  await expect(resultPanel.locator(".result-status")).toContainText(
    "CapabilityError",
    { timeout: 15000 },
  );
  await expect(
    resultPanel.getByText(/CAPABILITY_OUTPUT_SIZE_LIMIT/).first(),
  ).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole("button", { name: /Console limit/ }).click();
  await page.getByRole("button", { exact: true, name: "Run" }).click();
  await expect(resultPanel.getByText(/console capped/)).toBeVisible({
    timeout: 15000,
  });
  await expect(resultPanel.getByText(/entryLimitExceeded/).first()).toBeVisible(
    {
      timeout: 15000,
    },
  );
  await expect(resultPanel.getByText(/"truncated": true/)).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole("button", { name: /Audit buffer/ }).click();
  await page.getByRole("button", { exact: true, name: "Run" }).click();
  await expect(resultPanel.getByText(/audit capped/)).toBeVisible({
    timeout: 15000,
  });
  await expect(
    resultPanel.getByText(/capabilityCallsDropped/).first(),
  ).toBeVisible({
    timeout: 15000,
  });
  await expect(
    resultPanel.getByText(/"capabilityCallsTruncated": true/).first(),
  ).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole("button", { name: /Policy recipe helpers/ }).click();
  await page.getByRole("button", { exact: true, name: "Run" }).click();
  await expect(resultPanel.getByText(/recipe helpers applied/)).toBeVisible({
    timeout: 15000,
  });
  await expect(
    resultPanel.getByRole("heading", { name: "policy recipe helpers" }),
  ).toBeVisible({
    timeout: 15000,
  });
  await expect(resultPanel.getByText(/defaultMaxOutputBytes/).first()).toBeVisible(
    {
      timeout: 15000,
    },
  );
  await expect(resultPanel.getByText(/maxResultBytes/).first()).toBeVisible({
    timeout: 15000,
  });
  await expect(resultPanel.getByText(/recycleAfter/).first()).toBeVisible({
    timeout: 15000,
  });
});

// SB-7 worked example: createHibernatingIsolatePool. The panel drives
// /api/hibernate/{run,hibernate,stats}. Default source uses
// `globalThis.count = ...` so the increment survives hibernate + wake.
test("hibernation panel: run, force-hibernate, wake — state survives", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("hibernation-panel")).toBeVisible({
    timeout: 15000,
  });

  const result = () => page.getByTestId("hibernation-result");
  const active = page.getByTestId("hibernation-stats-active");
  const hibernated = page.getByTestId("hibernation-stats-hibernated");

  // Pick a unique key so the test is independent across runs.
  const key = `t-${Date.now()}`;
  await page.getByTestId("hibernation-key").selectOption("tenant-a");
  // Manual swap to a fresh key via JS — the select only has a/b/c, but
  // the route accepts any string; the panel sends whatever value is in
  // the <select> control. We use 'tenant-a' here and tolerate cross-run
  // residue (the test inspects DELTA, not absolute counts).
  void key;

  // First Run.
  await page.getByTestId("hibernation-run").click();
  await expect(result()).toContainText(/"count":/, { timeout: 15000 });
  const firstSnapshot = (await result().textContent()) ?? "";
  const firstCount = Number(/"count":\s*(\d+)/.exec(firstSnapshot)?.[1] ?? 0);
  expect(firstCount).toBeGreaterThanOrEqual(1);
  await expect(active).toContainText(/active: 1/);

  // Second Run reuses the context — count increments without a tx.
  await page.getByTestId("hibernation-run").click();
  await expect(result()).toContainText(`"count": ${firstCount + 1}`, {
    timeout: 15000,
  });

  // Force hibernate.
  await page.getByTestId("hibernation-hibernate").click();
  await expect(hibernated).toContainText(/hibernated: \d+/, { timeout: 15000 });
  await expect(active).toContainText(/active: 0/, { timeout: 15000 });

  // The "hibernate" transition is the latest event.
  await expect(
    page.getByTestId("hibernation-transitions").first(),
  ).toContainText("hibernate", { timeout: 15000 });

  // Run again — state must survive the wake from checkpoint.
  await page.getByTestId("hibernation-run").click();
  await expect(result()).toContainText(`"count": ${firstCount + 2}`, {
    timeout: 15000,
  });
  await expect(active).toContainText(/active: 1/);
});
