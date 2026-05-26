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

test("devtools dashboard shows live engine state", async ({ page }) => {
  await page.goto("/sync/devtools");
  // The SSE feed connects.
  await expect(page.locator("#status")).toHaveText("live", { timeout: 15000 });
  // The snapshot lists registered collections.
  await expect(page.locator("#collections")).toContainText("tasks", {
    timeout: 15000,
  });
  // The cron "pulse" schedule emits change activity every second — it streams in.
  await expect(page.locator("#activity")).toContainText("change", {
    timeout: 15000,
  });
  await expect(page.locator("#activity")).toContainText("pulse", {
    timeout: 15000,
  });
});

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

test("live RAG retrieval re-ranks as documents are ingested", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".sync-status")).toContainText("Live", {
    timeout: 15000,
  });

  const word = `zephyr${Date.now()}`;
  // Subscribe to the retrieval query first — nothing matches yet.
  await page.locator('input[aria-label="Retrieval query"]').fill(word);
  await expect(page.getByTestId("rag-results")).toContainText("No matches", {
    timeout: 10000,
  });

  // Ingest a matching document — the sync-backed store re-ranks live.
  const ingest = page.locator('input[aria-label="Ingest document"]');
  await ingest.fill(`an internal note about ${word} energy systems`);
  await ingest.press("Enter");
  await expect(
    page.getByTestId("rag-results").locator(".task-item", { hasText: word }),
  ).toBeVisible({ timeout: 10000 });
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

test("CRDT: concurrent edits from two clients merge and converge", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  const a = await context.newPage();
  const b = await context.newPage();
  const editor = (page: Page) => page.getByTestId("crdt-editor");

  await a.goto("/");
  await b.goto("/");
  await expect(a.locator(".sync-status")).toContainText("Live", {
    timeout: 15000,
  });
  await expect(b.locator(".sync-status")).toContainText("Live", {
    timeout: 15000,
  });

  // Both clients hydrate the same shared document, so they start converged.
  await expect
    .poll(async () => (await editor(a).inputValue()) === (await editor(b).inputValue()), {
      timeout: 15000,
    })
    .toBe(true);
  const base = await editor(a).inputValue();

  // Both type a distinct marker at the same time, before either edit has synced
  // — the conflict-free part: neither overwrites the other.
  const stamp = Date.now();
  const markerA = `alpha${stamp}`;
  const markerB = `bravo${stamp}`;
  await Promise.all([
    editor(a).fill(`${base} ${markerA}`),
    editor(b).fill(`${base} ${markerB}`),
  ]);

  // Both markers survive on both clients (merge, not last-write-wins)…
  for (const page of [a, b]) {
    await expect(editor(page)).toHaveValue(new RegExp(markerA), {
      timeout: 15000,
    });
    await expect(editor(page)).toHaveValue(new RegExp(markerB), {
      timeout: 15000,
    });
  }
  // …and the two clients converge on identical text.
  await expect
    .poll(async () => (await editor(a).inputValue()) === (await editor(b).inputValue()), {
      timeout: 15000,
    })
    .toBe(true);

  await context.close();
});

// Each non-React binding is checked against a React reference page (two pages at
// a time, context closed between) — it both sends (its edit reaches React) and
// receives (React's edit reaches it). Pairwise keeps memory low (the container's
// Chromium is crash-prone with many pages) and pinpoints any failing binding.
for (const framework of [
  { name: "vue", path: "/vue" },
  { name: "svelte", path: "/svelte" },
  { name: "angular", path: "/angular" },
] as const) {
  test(`CRDT: the ${framework.name} binding sends and receives collaborative edits`, async ({
    browser,
    baseURL,
  }) => {
    const editor = (page: Page) => page.getByTestId("crdt-editor");
    const context = await browser.newContext({ baseURL });
    const react = await context.newPage();
    const other = await context.newPage();
    await react.goto("/");
    await other.goto(framework.path);
    for (const page of [react, other]) {
      await expect(page.locator(".sync-status")).toContainText("Live", {
        timeout: 15000,
      });
      await expect(editor(page)).toBeVisible({ timeout: 15000 });
    }

    const stamp = Date.now();
    // The framework SENDS: type on it, the edit reaches React.
    const sendMarker = `${framework.name}send${stamp}`;
    const otherBase = await editor(other).inputValue();
    await editor(other).fill(`${otherBase} ${sendMarker}`);
    await expect(editor(react)).toHaveValue(new RegExp(sendMarker), {
      timeout: 15000,
    });

    // The framework RECEIVES: type on React, the edit reaches it.
    const recvMarker = `${framework.name}recv${stamp}`;
    const reactBase = await editor(react).inputValue();
    await editor(react).fill(`${reactBase} ${recvMarker}`);
    await expect(editor(other)).toHaveValue(new RegExp(recvMarker), {
      timeout: 15000,
    });

    await context.close();
  });
}

test("CRDT: the Yjs adapter merges concurrent edits and converges", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  const a = await context.newPage();
  const b = await context.newPage();
  const editor = (page: Page) => page.getByTestId("yjs-editor");

  await a.goto("/");
  await b.goto("/");
  for (const page of [a, b]) {
    await expect(page.locator(".sync-status")).toContainText("Live", {
      timeout: 15000,
    });
    await expect(editor(page)).toBeVisible({ timeout: 15000 });
  }

  // Both clients start from the same Yjs-backed note, then type concurrently.
  await expect
    .poll(async () => (await editor(a).inputValue()) === (await editor(b).inputValue()), {
      timeout: 15000,
    })
    .toBe(true);
  const base = await editor(a).inputValue();
  const stamp = Date.now();
  const markerA = `yjsa${stamp}`;
  const markerB = `yjsb${stamp}`;
  await Promise.all([
    editor(a).fill(`${base} ${markerA}`),
    editor(b).fill(`${base} ${markerB}`),
  ]);

  for (const page of [a, b]) {
    await expect(editor(page)).toHaveValue(new RegExp(markerA), {
      timeout: 15000,
    });
    await expect(editor(page)).toHaveValue(new RegExp(markerB), {
      timeout: 15000,
    });
  }
  await expect
    .poll(async () => (await editor(a).inputValue()) === (await editor(b).inputValue()), {
      timeout: 15000,
    })
    .toBe(true);

  await context.close();
});

test("CRDT: a collaborator's cursor position shows up live", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto("/");
  await b.goto("/");
  for (const page of [a, b]) {
    await expect(page.locator(".sync-status")).toContainText("Live", {
      timeout: 15000,
    });
    await expect(page.getByTestId("crdt-editor")).toBeVisible({
      timeout: 15000,
    });
  }

  // Move A's caret in the shared doc — it broadcasts a CRDT-anchored cursor.
  await a.getByTestId("crdt-editor").click();
  await a.getByTestId("crdt-editor").press("End");

  // B renders A's caret as a live column position.
  await expect(b.getByTestId("doc-cursors")).toContainText("col", {
    timeout: 15000,
  });
  await expect(b.getByTestId("doc-cursors")).not.toContainText(
    "No other cursors",
  );

  await context.close();
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

// ─────────────────────────────────────────────────────────────────────────────
// FLAGSHIP: the issues tracker section appended onto the React page. Same
// engine, richer row model (CRDT body, AI summarize, live "similar issues"
// retrieval). These tests are React-only — the other framework pages don't
// embed the issues UX.
// ─────────────────────────────────────────────────────────────────────────────

const newIssue = (page: Page) => page.getByTestId("new-issue");
const issueList = (page: Page) => page.getByTestId("issue-list");
const issueRow = (page: Page, title: string) =>
  issueList(page).locator(".issue-row", { hasText: title });

test.describe("Issues tracker (React)", () => {
  test("loads with the seed issues and the team-counts pulse", async ({
    page,
  }) => {
    const { errors } = watchConsole(page);
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator(".sync-status")).toContainText("Live", {
      timeout: 15000,
    });
    await expect(page.getByTestId("issues-app")).toBeVisible({
      timeout: 15000,
    });
    await expect(issueList(page)).toContainText("Welcome", { timeout: 15000 });
    // The 10-second cron tick publishes team counts; it ticks on connect.
    await expect(page.getByTestId("counts")).toContainText("open", {
      timeout: 15000,
    });
    expect(errors).toHaveLength(0);
  });

  test("creates, changes status, and deletes an issue", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".sync-status")).toContainText("Live", {
      timeout: 15000,
    });

    const title = uniqueTitle("issue-e2e");
    await newIssue(page).fill(title);
    await newIssue(page).press("Enter");
    await expect(issueRow(page, title)).toBeVisible({ timeout: 10000 });
    // Created issues auto-select; the detail panel opens.
    await expect(page.getByTestId("issue-title")).toHaveText(title, {
      timeout: 10000,
    });

    await page.getByTestId("status-select").selectOption("in-progress");
    await expect(issueRow(page, title)).toContainText("In progress", {
      timeout: 10000,
    });

    await page
      .getByTestId("issue-detail")
      .locator(".danger", { hasText: "Delete" })
      .click();
    await expect(issueRow(page, title)).toHaveCount(0, { timeout: 10000 });
  });

  test("live issue search by title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".sync-status")).toContainText("Live", {
      timeout: 15000,
    });
    const word = `widget${Date.now()}`;
    await newIssue(page).fill(`${word} discussion`);
    await newIssue(page).press("Enter");
    await expect(issueRow(page, word)).toBeVisible({ timeout: 10000 });

    await page.getByTestId("issue-search").fill(word);
    await expect(issueRow(page, word)).toBeVisible({ timeout: 10000 });
    await page.getByTestId("issue-search").fill("qqzzxx-no-match");
    await expect(issueList(page)).toContainText("No matches", {
      timeout: 10000,
    });
    // Clear so subsequent tests aren't stuck on the empty filter.
    await page.getByTestId("issue-search").fill("");
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
      await expect(page.locator(".sync-status")).toContainText("Live", {
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

  test("AI: Summarize returns a summary from the server", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".sync-status")).toContainText("Live", {
      timeout: 15000,
    });

    await issueRow(page, "Welcome").click();
    await expect(page.getByTestId("issue-detail")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("summarize").click();
    await expect(page.getByTestId("ai-summary")).toContainText("Summary", {
      timeout: 10000,
    });
  });

  test("RAG: similar issues panel surfaces related rows live", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".sync-status")).toContainText("Live", {
      timeout: 15000,
    });

    const tag = `tagq${Date.now()}`;
    await newIssue(page).fill(`${tag} alpha`);
    await newIssue(page).press("Enter");
    await expect(issueRow(page, `${tag} alpha`)).toBeVisible({ timeout: 10000 });
    await newIssue(page).fill(`${tag} bravo`);
    await newIssue(page).press("Enter");
    await expect(issueRow(page, `${tag} bravo`)).toBeVisible({ timeout: 10000 });

    await issueRow(page, `${tag} bravo`).click();
    await expect(page.getByTestId("similar")).toContainText(`${tag} alpha`, {
      timeout: 15000,
    });
  });
});
