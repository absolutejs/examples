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
      // Presence joined (at least this client shows as online).
      await expect(page.getByTestId("presence-online")).toContainText(
        "online",
        { timeout: 15000 },
      );

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

// Read the titles persisted in the IndexedDB local-first cache (the React/Vue/
// Svelte/Angular pages write confirmed rows under `tasks`).
const cachedTitles = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open("absolutejs-sync", 1);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("collections")) {
            resolve([]);
            return;
          }
          const request = db
            .transaction("collections", "readonly")
            .objectStore("collections")
            .get("tasks");
          request.onsuccess = () => {
            const snapshot = request.result as
              | { rows?: { title: string }[] }
              | undefined;
            resolve((snapshot?.rows ?? []).map((row) => row.title));
          };
          request.onerror = () => resolve([]);
        };
        open.onerror = () => resolve([]);
      }),
  );

test("local-first: cached rows render after reload with the socket offline", async ({
  page,
}) => {
  // Online first: add a task so the server confirms it and the client caches it.
  await page.goto("/");
  await expect(page.locator(".sync-status")).toContainText("Live", {
    timeout: 15000,
  });
  const title = uniqueTitle("local-first");
  await addTask(page, title);

  // Wait until the confirmed row has been written to the IndexedDB cache.
  await expect
    .poll(async () => (await cachedTitles(page)).includes(title), {
      timeout: 10000,
    })
    .toBe(true);

  // Go offline: intercept the sync socket and never wire it to the server, so a
  // reload gets no snapshot — whatever renders must come from the local cache.
  await page.routeWebSocket(/\/sync\/ws$/, () => {
    // Accept the client's connection but stay silent (no server, no replies).
  });
  await page.reload();

  // The task is still there: served from the IndexedDB cache (offline read)…
  await expect(taskRow(page, title)).toBeVisible({ timeout: 15000 });
  // …and it is not a live connection — the socket never delivered a snapshot.
  await expect(page.locator(".sync-status")).toContainText("Connecting", {
    timeout: 5000,
  });
});

test("a change in one client appears live in another", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
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

const onlineCount = async (page: Page) => {
  const text = await page.getByTestId("presence-online").textContent();

  return Number.parseInt(text ?? "0", 10);
};

test("presence: online count and typing propagate across clients", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto("/");
  await b.goto("/");
  await expect(a.getByTestId("presence-online")).toContainText("online", {
    timeout: 15000,
  });
  await expect(b.getByTestId("presence-online")).toContainText("online", {
    timeout: 15000,
  });

  // Both clients are counted (>= 2; the room may have other tabs in the suite).
  await expect
    .poll(() => onlineCount(a), { timeout: 15000 })
    .toBeGreaterThanOrEqual(2);

  // Typing in B shows up on A.
  await b.locator('input[aria-label="New task"]').fill("hey there");
  await expect(a.locator(".presence-typing")).toContainText("typing", {
    timeout: 15000,
  });

  // B closing drops A's online count (auto-cleanup on disconnect).
  const before = await onlineCount(a);
  await b.close();
  await expect
    .poll(() => onlineCount(a), { timeout: 15000 })
    .toBeLessThan(before);

  await context.close();
});

const pulseCount = async (page: Page) => {
  const text = await page.getByTestId("server-pulse").textContent();
  const match = text?.match(/#(\d+)/);

  return match ? Number.parseInt(match[1], 10) : 0;
};

test("scheduled functions: a server-side cron job pushes live updates", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".sync-status")).toContainText("Live", {
    timeout: 15000,
  });
  await expect(page.getByTestId("server-pulse")).toContainText("Server pulse", {
    timeout: 15000,
  });

  // The pulse arrives, then the scheduled function advances it live (every 1s).
  await expect.poll(() => pulseCount(page), { timeout: 15000 }).toBeGreaterThan(
    0,
  );
  const first = await pulseCount(page);
  await expect
    .poll(() => pulseCount(page), { timeout: 15000 })
    .toBeGreaterThan(first);
});

test("live full-text search returns matching tasks, live as they're added", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".sync-status")).toContainText("Live", {
    timeout: 15000,
  });

  // Add a task with a unique word, then search for it.
  const word = `zebra${Date.now()}`;
  await addTask(page, `${word} sprint planning`);

  await page.locator('input[aria-label="Search tasks"]').fill(word);
  const results = page.getByTestId("search-results");
  // The just-added task shows up in the live search index.
  await expect(results.locator(".task-item", { hasText: word })).toBeVisible({
    timeout: 10000,
  });
  // A query with no matches yields the empty state.
  await page.locator('input[aria-label="Search tasks"]').fill("qqzzxx-nomatch");
  await expect(results).toContainText("No matches", { timeout: 10000 });
});

test("declarative permissions: a viewer can read but the server rejects its writes", async ({
  page,
}) => {
  // Connect read-only (?role=viewer); the engine's write rule denies viewers.
  await page.goto("/?role=viewer");
  await expect(page.locator(".sync-status")).toContainText("Live", {
    timeout: 15000,
  });
  // Reads work — the snapshot rendered — and we're flagged read-only.
  await expect(page.locator(".task-item").first()).toBeVisible();
  await expect(page.getByTestId("viewer-banner")).toBeVisible();

  // Attempt a write: it applies optimistically, the server rejects it, and the
  // optimistic row rolls back — so it never persists.
  const title = uniqueTitle("viewer-denied");
  await taskInput(page).fill(title);
  await taskInput(page).press("Enter");

  await expect(page.getByTestId("write-denied")).toBeVisible({
    timeout: 10000,
  });
  await expect(taskRow(page, title)).toHaveCount(0, { timeout: 10000 });
});
