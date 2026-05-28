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
  await expect(resultPanel.getByText("execution receipt")).toBeVisible({
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
});
