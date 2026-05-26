import { test, expect, type Page } from "@playwright/test";

const newIssue = (page: Page) => page.getByTestId("new-issue");
const issueList = (page: Page) => page.getByTestId("issue-list");
const issueRow = (page: Page, title: string) =>
  issueList(page).locator(".issue-row", { hasText: title });

const uniqueTitle = (label: string) =>
  `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test("loads live, with the seed issues and the team-counts pulse", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".conn-dot")).toHaveClass(/conn-live/, {
    timeout: 15000,
  });
  await expect(issueList(page)).toContainText("Welcome", { timeout: 15000 });
  // The scheduled cron job ticks team counts live.
  await expect(page.getByTestId("counts")).toContainText("open", {
    timeout: 15000,
  });
  expect(errors).toHaveLength(0);
});

test("creates, toggles status, and deletes an issue", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".conn-dot")).toHaveClass(/conn-live/, {
    timeout: 15000,
  });

  const title = uniqueTitle("e2e");
  await newIssue(page).fill(title);
  await newIssue(page).press("Enter");
  await expect(issueRow(page, title)).toBeVisible({ timeout: 10000 });
  // Created issues are auto-selected — the detail panel opens.
  await expect(page.getByTestId("issue-title")).toHaveText(title, {
    timeout: 10000,
  });

  // Change status → the row's badge and the dropdown both reflect it.
  await page.getByTestId("status-select").selectOption("in-progress");
  await expect(issueRow(page, title)).toContainText("In progress", {
    timeout: 10000,
  });

  // Delete.
  await page.locator(".danger", { hasText: "Delete" }).click();
  await expect(issueRow(page, title)).toHaveCount(0, { timeout: 10000 });
});

test("live search by title", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".conn-dot")).toHaveClass(/conn-live/, {
    timeout: 15000,
  });
  const word = `widget${Date.now()}`;
  await newIssue(page).fill(`${word} discussion`);
  await newIssue(page).press("Enter");
  await expect(issueRow(page, word)).toBeVisible({ timeout: 10000 });

  await page.getByTestId("search").fill(word);
  await expect(issueRow(page, word)).toBeVisible({ timeout: 10000 });
  await page.getByTestId("search").fill("qqzzxx-no-match");
  await expect(issueList(page)).toContainText("No matches", {
    timeout: 10000,
  });
});

test("collaborative description merges concurrent edits across tabs", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto("/");
  await b.goto("/");
  for (const page of [a, b]) {
    await expect(page.locator(".conn-dot")).toHaveClass(/conn-live/, {
      timeout: 15000,
    });
  }

  // Both clients open the same seeded issue.
  const title = "Welcome";
  await issueRow(a, title).click();
  await issueRow(b, title).click();
  for (const page of [a, b]) {
    await expect(page.getByTestId("body-editor")).toBeVisible({
      timeout: 10000,
    });
  }
  // Make sure both started from the same base text.
  await expect
    .poll(
      async () =>
        (await a.getByTestId("body-editor").inputValue()) ===
        (await b.getByTestId("body-editor").inputValue()),
      { timeout: 15000 },
    )
    .toBe(true);

  const base = await a.getByTestId("body-editor").inputValue();
  const stamp = Date.now();
  const markerA = `alpha${stamp}`;
  const markerB = `bravo${stamp}`;
  // Concurrent fills before sync.
  await Promise.all([
    a.getByTestId("body-editor").fill(`${base} ${markerA}`),
    b.getByTestId("body-editor").fill(`${base} ${markerB}`),
  ]);

  for (const page of [a, b]) {
    await expect(page.getByTestId("body-editor")).toHaveValue(
      new RegExp(markerA),
      { timeout: 15000 },
    );
    await expect(page.getByTestId("body-editor")).toHaveValue(
      new RegExp(markerB),
      { timeout: 15000 },
    );
  }
  // And both tabs converge on identical text.
  await expect
    .poll(
      async () =>
        (await a.getByTestId("body-editor").inputValue()) ===
        (await b.getByTestId("body-editor").inputValue()),
      { timeout: 15000 },
    )
    .toBe(true);

  await context.close();
});

test("declarative permission: a viewer is rejected on writes", async ({
  page,
}) => {
  await page.goto("/?role=viewer");
  await expect(page.locator(".conn-dot")).toHaveClass(/conn-live/, {
    timeout: 15000,
  });
  await expect(page.getByTestId("viewer-banner")).toBeVisible();

  const title = uniqueTitle("viewer-denied");
  await newIssue(page).fill(title);
  await newIssue(page).press("Enter");
  await expect(page.getByTestId("write-denied")).toBeVisible({
    timeout: 10000,
  });
  await expect(issueRow(page, title)).toHaveCount(0, { timeout: 10000 });
});
