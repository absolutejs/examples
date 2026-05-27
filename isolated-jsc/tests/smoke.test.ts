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
  await expect(
    resultPanel.getByText("hello from inside the sandbox", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(resultPanel.getByText("2", { exact: true })).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole("button", { name: /Runaway loop/ }).click();
  await page.getByRole("button", { exact: true, name: "Run" }).click();
  await expect(resultPanel.getByText(/TimeoutError/)).toBeVisible({
    timeout: 10000,
  });
  await expect(resultPanel.getByText(/Script exceeded/)).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole("button", { name: /No host filesystem access/ }).click();
  await page.getByRole("button", { exact: true, name: "Run" }).click();
  await expect(resultPanel.getByText(/OK .* ms/)).toBeVisible({
    timeout: 15000,
  });
  await expect(
    resultPanel.getByText("undefined,undefined,undefined"),
  ).toBeVisible({ timeout: 15000 });
});
