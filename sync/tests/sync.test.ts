import { test, expect, type Page } from "@playwright/test";

// One page per framework, all driving the same live `tasks` collection over the
// engine's WebSocket. The component pages use the framework bindings
// (`@absolutejs/sync/{react,vue,svelte,angular}`); HTML/HTMX use a native
// WebSocket. Each test gives its task a unique title so the suite is safe to run
// against the shared, persistent server state without colliding.

const FRAMEWORKS = [
  { name: "React", path: "/" },
  { name: "Svelte", path: "/svelte" },
  { name: "Vue", path: "/vue" },
  { name: "Angular", path: "/angular" },
  { name: "HTML", path: "/html" },
  { name: "HTMX", path: "/htmx" },
] as const;

const uniqueTitle = (label: string) =>
  `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// The text input carries `aria-label="New task"` on every page (component and
// static), so one selector drives all six.
const taskInput = (page: Page) => page.locator('input[aria-label="New task"]');
const taskRow = (page: Page, title: string) =>
  page.locator(".task-item", { hasText: title });

const addTask = async (page: Page, title: string) => {
  await taskInput(page).fill(title);
  await taskInput(page).press("Enter");
  await expect(taskRow(page, title)).toBeVisible({ timeout: 10000 });
  // An optimistic insert is shown immediately, then the temp row is replaced by
  // the server-confirmed row (a DOM node swap). Let that settle so later actions
  // don't grab the about-to-be-detached element.
  await page.waitForTimeout(400);
};

// Collect real console errors / hydration warnings (ignoring dev-mode noise).
const watchConsole = (page: Page) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("development mode")) return;
    if (message.type() === "error") {
      errors.push(text);
    }
    if (message.type() === "warning") {
      if (
        text.includes("Hydration") ||
        text.includes("mismatch") ||
        /NG\d{4}/.test(text)
      ) {
        warnings.push(text);
      }
    }
  });

  return { errors, warnings };
};

for (const framework of FRAMEWORKS) {
  test.describe(`${framework.name} (${framework.path})`, () => {
    test("loads, subscribes, and hydrates the live collection (no console errors)", async ({
      page,
    }) => {
      const { errors, warnings } = watchConsole(page);

      const response = await page.goto(framework.path);
      expect(response?.status()).toBe(200);

      // The socket is open once the status reads "Live".
      await expect(page.locator(".sync-status")).toContainText("Live", {
        timeout: 15000,
      });
      // The seed snapshot rendered.
      await expect(page.locator(".task-item").first()).toBeVisible();

      expect(errors, `console errors on ${framework.name}`).toHaveLength(0);
      expect(warnings, `hydration warnings on ${framework.name}`).toHaveLength(
        0,
      );
    });

    test("adds, toggles, and removes a task", async ({ page }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status")).toContainText("Live", {
        timeout: 15000,
      });

      const title = uniqueTitle(framework.name);
      await addTask(page, title);

      const row = taskRow(page, title);
      const checkbox = row.locator('input[type="checkbox"]');
      await expect(checkbox).not.toBeChecked();

      // Toggle done (server confirms; optimistic on the component pages).
      await checkbox.click();
      await expect(checkbox).toBeChecked({ timeout: 10000 });
      await expect(row).toHaveClass(/done/);

      // Toggle back.
      await checkbox.click();
      await expect(checkbox).not.toBeChecked({ timeout: 10000 });

      // Remove.
      await row.locator(".task-remove").click();
      await expect(row).toHaveCount(0, { timeout: 10000 });
    });
  });
}

test("a change in one client appears live in another", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
  });
  const reactPage = await context.newPage();
  const sveltePage = await context.newPage();

  await reactPage.goto("/");
  await sveltePage.goto("/svelte");
  await expect(reactPage.locator(".sync-status")).toContainText("Live", {
    timeout: 15000,
  });
  await expect(sveltePage.locator(".sync-status")).toContainText("Live", {
    timeout: 15000,
  });

  const title = uniqueTitle("cross-client");

  // Add on React → it must appear on Svelte without a reload (diff broadcast).
  await addTask(reactPage, title);
  await expect(taskRow(sveltePage, title)).toBeVisible({ timeout: 15000 });

  // Toggle on Svelte → reflected back on React.
  await taskRow(sveltePage, title).locator('input[type="checkbox"]').click();
  await expect(
    taskRow(reactPage, title).locator('input[type="checkbox"]'),
  ).toBeChecked({ timeout: 15000 });

  // Remove on React → disappears on Svelte.
  await taskRow(reactPage, title).locator(".task-remove").click();
  await expect(taskRow(sveltePage, title)).toHaveCount(0, { timeout: 15000 });

  await context.close();
});
