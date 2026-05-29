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
      await expect(page.locator(".sync-status").first()).toContainText(
        "Live",
        { timeout: 15000 },
      );
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
      await expect(page.locator(".sync-status").first()).toContainText(
        "Live",
        { timeout: 15000 },
      );

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

// sync-pack-presence 0.3: the typing state patched onto the per-actor
// presence row by `presence:typing` shows up on every other client via
// the same collection diff feed. Different from the ws-broadcast
// presence above — this one rides through the pack's owned table and
// auto-clears via `state.typingExpiresAt`.
test("pack presence: typing state propagates across framework tabs", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  const a = await context.newPage();
  const b = await context.newPage();
  // Cross-framework: A is React, B is Vue. Both wire pack typing the
  // same way, so a write from A's input appears in B's pack-typing line.
  await a.goto("/");
  await b.goto("/vue");
  await expect(a.locator(".sync-status").first()).toContainText("Live", {
    timeout: 15000,
  });
  await expect(b.locator(".sync-status").first()).toContainText("Live", {
    timeout: 15000,
  });
  // Wait for the heartbeat to land so presence:typing won't reject for
  // "no heartbeat for ${rowId}".
  await expect(a.getByTestId("presence-pack-members")).toContainText(
    /\d+ in channel/,
    { timeout: 15000 },
  );
  await expect(b.getByTestId("presence-pack-members")).toContainText(
    /\d+ in channel/,
    { timeout: 15000 },
  );
  await a.waitForTimeout(500);

  // Fill A's input → pack typing fires on A; B's pack-typing badge shows
  // "react-tab typing (pack)…".
  await a.locator('input[aria-label="New task"]').fill("from-react");
  await expect(b.getByTestId("presence-pack-typing")).toContainText(
    /typing \(pack\)/,
    { timeout: 15000 },
  );

  // Clear A's input → pack typing clears (server-side); B's badge empties.
  await a.locator('input[aria-label="New task"]').fill("");
  await expect.poll(
    async () =>
      (await b.getByTestId("presence-pack-typing").textContent())?.trim() ?? "",
    { timeout: 15000 },
  ).toBe("");

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
      await expect(page.locator(".sync-status").first()).toContainText(
        "Live",
        { timeout: 15000 },
      );
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
      await expect(page.locator(".sync-status").first()).toContainText(
        "Live",
        { timeout: 15000 },
      );
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

// ─────────────────────────────────────────────────────────────────────────────
// EDEN-TYPED DOGFOOD — the second tasks card on the React page goes through
// treaty<typeof server> + syncStore. Same `tasks` data, typed Eden HTTP
// hydrate + mutate path. These tests check the typed path actually round-trips
// AND stays in sync with the existing useSyncCollection card above it.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Eden-typed tracker (React, /sync/tasks via treaty)", () => {
  test("renders, hydrates, accepts a typed add, and stays live with the WS card", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".sync-status").first()).toContainText("Live", {
      timeout: 15000,
    });
    // The Eden card mounts and shows the live banner with its own status.
    await expect(page.getByTestId("eden-typed-tracker")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("eden-typed-tracker")).toContainText(
      "Live — Eden + WS",
      { timeout: 15000 },
    );

    // The typed list reflects the seed tasks from the same backend store.
    await expect(page.getByTestId("eden-count")).toContainText("typed", {
      timeout: 10000,
    });

    // Add via the typed input — Eden POST → engine mutation → WS diff to both
    // cards (since both subscribe to "tasks").
    const title = `eden-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await page.getByTestId("eden-input").fill(title);
    await page.getByTestId("eden-input").press("Enter");
    // The new row appears in the typed card…
    await expect(
      page.getByTestId("eden-task-list").locator(".task-item", { hasText: title }),
    ).toBeVisible({ timeout: 10000 });
    // …AND in the original WS card, because both rest on the same engine.
    await expect(taskRow(page, title).first()).toBeVisible({ timeout: 10000 });
  });

  test("the typed openapi route is mounted (/openapi or /sync/tasks responds)", async ({
    request,
  }) => {
    // The typed GET should return an array (Eden-typed `Task[]` on the client).
    const response = await request.get("/sync/tasks");
    expect(response.ok()).toBe(true);
    const data: unknown = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sync packs — presence, comments, digest. Wired into the four reactive
// framework pages (React / Svelte / Vue / Angular) via each framework's
// idiomatic hook. HTML and HTMX show a "Sync packs note" pointer instead of
// the panels because they're deliberately framework-free demos.
// ─────────────────────────────────────────────────────────────────────────────

const REACTIVE_FRAMEWORKS = [
  { name: "React", path: "/" },
  { name: "Svelte", path: "/svelte" },
  { name: "Vue", path: "/vue" },
  { name: "Angular", path: "/angular" },
] as const;

const uniqueComment = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const postComment = async (page: Page, body: string) => {
  await page.getByTestId("comment-input").fill(body);
  await page.getByTestId("comment-input").press("Enter");
  // The pack is server-authoritative; wait for the row to land in the list.
  await expect(
    page.getByTestId("comments-list").locator(".task-item", { hasText: body }),
  ).toBeVisible({ timeout: 10000 });
};

for (const framework of REACTIVE_FRAMEWORKS) {
  test.describe(`${framework.name} sync-packs`, () => {
    test("renders all three pack panels (presence + digest + comments)", async ({
      page,
    }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText(
        "Live",
        { timeout: 15000 },
      );

      // Presence-pack badge — at minimum this client is in the channel.
      await expect(page.getByTestId("presence-pack-members")).toContainText(
        /\d+ in channel/,
        { timeout: 15000 },
      );
      // Digest-pack panel + cursor + fire button.
      await expect(page.getByTestId("digest-pack-panel")).toBeVisible();
      await expect(page.getByTestId("digest-cursor")).toContainText(
        "Last digest:",
      );
      await expect(page.getByTestId("digest-fire")).toBeVisible();
      // Comments-pack panel + input.
      await expect(page.getByTestId("comments-pack-panel")).toBeVisible();
      await expect(page.getByTestId("comment-input")).toBeVisible();
    });

    test("comments: posting renders the row with an own × delete button", async ({
      page,
    }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText(
        "Live",
        { timeout: 15000 },
      );

      const body = uniqueComment(framework.name.toLowerCase());
      await postComment(page, body);

      // The row exists AND has the framework-stable own × button (per-row
      // permission: row.authorId === getActorId(ctx) is what gates render).
      const row = page
        .getByTestId("comments-list")
        .locator(".task-item", { hasText: body });
      await expect(row).toBeVisible();
      await expect(row.locator("button", { hasText: "×" })).toBeVisible();
    });

    test("digest: clicking 'Fire digest now' updates the cursor", async ({
      page,
    }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText(
        "Live",
        { timeout: 15000 },
      );

      // Read the cursor before firing — it may already be set from the 15s
      // cron, so we don't assert "never"; we just compare snapshots.
      const before = await page.getByTestId("digest-cursor").textContent();
      await page.getByTestId("digest-fire").click();
      // Cursor changes within a couple of seconds (server runs the schedule,
      // applyChange fans the diff back to this socket).
      await expect
        .poll(
          async () =>
            (await page.getByTestId("digest-cursor").textContent()) ?? "",
          { timeout: 10000 },
        )
        .not.toBe(before);
    });
  });
}

test("comments: a comment posted in one framework appears in another", async ({
  browser,
}) => {
  const reactCtx = await browser.newContext();
  const vueCtx = await browser.newContext();
  const reactPage = await reactCtx.newPage();
  const vuePage = await vueCtx.newPage();
  try {
    await reactPage.goto("/");
    await vuePage.goto("/vue");
    await expect(reactPage.locator(".sync-status").first()).toContainText(
      "Live",
      { timeout: 15000 },
    );
    await expect(vuePage.locator(".sync-status").first()).toContainText(
      "Live",
      { timeout: 15000 },
    );

    const body = uniqueComment("cross-framework");
    await postComment(reactPage, body);

    // Vue sees the same row over the shared engine. The Vue tab does NOT see
    // a × button — it's not the author (different userId in a separate
    // browser context).
    const vueRow = vuePage
      .getByTestId("comments-list")
      .locator(".task-item", { hasText: body });
    await expect(vueRow).toBeVisible({ timeout: 10000 });
    await expect(vueRow.locator("button", { hasText: "×" })).toHaveCount(0);
  } finally {
    await reactCtx.close();
    await vueCtx.close();
  }
});

// Comments 0.4 reactions — each comment row carries three emoji buttons
// (👍 ❤️ 🎉). Clicking toggles the per-actor reaction; the count updates
// live across tabs/frameworks via the comment_reactions collection.
for (const framework of REACTIVE_FRAMEWORKS) {
  test.describe(`${framework.name} comments reactions`, () => {
    test("clicking 👍 toggles the per-actor reaction and ticks the count", async ({
      page,
    }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText("Live", {
        timeout: 15000,
      });

      // Post a comment so we have a row to react to.
      const body = uniqueComment(`react-${framework.name.toLowerCase()}`);
      await postComment(page, body);

      const row = page
        .getByTestId("comments-list")
        .locator(".task-item", { hasText: body });
      const thumbs = row.locator('[data-testid$="-👍"]').first();
      await expect(thumbs).toBeVisible({ timeout: 10000 });
      await expect(thumbs).toContainText("👍 0");

      // Click — count goes to 1.
      await thumbs.click();
      await expect(thumbs).toContainText("👍 1", { timeout: 10000 });

      // Click again — toggles back to 0.
      await thumbs.click();
      await expect(thumbs).toContainText("👍 0", { timeout: 10000 });
    });
  });
}

for (const staticPath of ["/html", "/htmx"] as const) {
  test(`${staticPath} shows the 'Sync packs note' pointer to the framework demos`, async ({
    page,
  }) => {
    await page.goto(staticPath);
    await expect(page.getByText(/Sync packs note/)).toBeVisible();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications + favorites packs — wired across all four reactive frameworks
// (React/Vue/Svelte/Angular). Each uses its idiomatic surface but renders
// the same testids so the test loop covers them uniformly.
// ─────────────────────────────────────────────────────────────────────────────

for (const framework of REACTIVE_FRAMEWORKS) {
  test.describe(`${framework.name} sync-pack-notifications`, () => {
    test("renders panel; send increments unread; mark decrements", async ({
      page,
    }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText("Live", {
        timeout: 15000,
      });
      await expect(page.getByTestId("notifications-pack-panel")).toBeVisible();

      const readUnread = async (): Promise<number> => {
        const text = await page
          .getByTestId("notifications-unread-count")
          .textContent();
        const match = text?.match(/(\d+)/);
        return match ? Number(match[1]) : 0;
      };
      const before = await readUnread();
      await page.getByTestId("notifications-send").click();
      await expect.poll(readUnread, { timeout: 10000 }).toBe(before + 1);

      await page
        .locator('[data-testid^="notification-mark-read-"]')
        .first()
        .click();
      await expect.poll(readUnread, { timeout: 10000 }).toBe(before);
    });

    test("Mark all read clears the badge", async ({ page }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText("Live", {
        timeout: 15000,
      });
      await page.getByTestId("notifications-send").click();
      await page.getByTestId("notifications-send").click();
      await page.getByTestId("notifications-send").click();
      await expect
        .poll(
          async () => {
            const text = await page
              .getByTestId("notifications-unread-count")
              .textContent();
            return Number(text?.match(/(\d+)/)?.[1] ?? 0);
          },
          { timeout: 10000 },
        )
        .toBeGreaterThan(0);

      await page.getByTestId("notifications-mark-all-read").click();
      await expect(
        page.getByTestId("notifications-unread-count"),
      ).toContainText("0 unread", { timeout: 10000 });
    });

    test("kindFilter tabs filter the unread badge client-side", async ({
      page,
    }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText("Live", {
        timeout: 15000,
      });
      await expect(
        page.getByTestId("notifications-kind-tabs"),
      ).toBeVisible();

      const badge = page.getByTestId("notifications-unread-count");
      const readBadge = async (): Promise<number> => {
        const text = await badge.textContent();
        return Number(text?.match(/(\d+)/)?.[1] ?? 0);
      };

      await page.getByTestId("notifications-tab-mention").click();
      const beforeMention = await readBadge();
      await page.getByTestId("notifications-send").click();
      await expect.poll(readBadge, { timeout: 10000 }).toBe(beforeMention + 1);
      await expect(badge).toContainText("(mention)");

      await page.getByTestId("notifications-tab-reply").click();
      await expect(badge).toContainText("(reply)", { timeout: 5000 });
      await expect.poll(readBadge, { timeout: 10000 }).toBe(0);

      await page.getByTestId("notifications-tab-system").click();
      await expect(badge).toContainText("(system)", { timeout: 5000 });
      await expect.poll(readBadge, { timeout: 10000 }).toBe(0);

      await page.getByTestId("notifications-tab-all").click();
      await expect.poll(readBadge, { timeout: 10000 }).toBeGreaterThan(0);
    });
  });

  test.describe(`${framework.name} sync-pack-favorites`, () => {
    test("clicking ☆ favorites a task and it appears in the favorites panel", async ({
      page,
    }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText("Live", {
        timeout: 15000,
      });
      await expect(page.getByTestId("favorites-pack-panel")).toBeVisible();

      const title = uniqueTitle(`fav-${framework.name.toLowerCase()}`);
      await taskInput(page).first().fill(title);
      await taskInput(page).first().press("Enter");
      await expect(taskRow(page, title).first()).toBeVisible({
        timeout: 10000,
      });
      await page.waitForTimeout(400);

      const star = taskRow(page, title)
        .first()
        .locator('[data-testid^="task-fav-"]')
        .first();
      await expect(star).toHaveText("☆");
      await star.click();
      await expect(star).toHaveText("★", { timeout: 10000 });

      await expect(
        page
          .getByTestId("favorites-list")
          .locator(".task-item", { hasText: title }),
      ).toBeVisible({ timeout: 10000 });

      await star.click();
      await expect(star).toHaveText("☆", { timeout: 10000 });
      await expect(
        page
          .getByTestId("favorites-list")
          .locator(".task-item", { hasText: title }),
      ).toHaveCount(0);
    });

    test("pinning bubbles a favorite above newer unpinned ones", async ({
      page,
    }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText("Live", {
        timeout: 15000,
      });

      // Create two tasks (A first, then B) so B is newer than A.
      const titleA = uniqueTitle(`pinA-${framework.name.toLowerCase()}`);
      const titleB = uniqueTitle(`pinB-${framework.name.toLowerCase()}`);
      for (const title of [titleA, titleB]) {
        await taskInput(page).first().fill(title);
        await taskInput(page).first().press("Enter");
        await expect(taskRow(page, title).first()).toBeVisible({
          timeout: 10000,
        });
      }
      // Favorite both
      for (const title of [titleA, titleB]) {
        await taskRow(page, title)
          .first()
          .locator('[data-testid^="task-fav-"]')
          .first()
          .click();
      }
      const favoritesList = page.getByTestId("favorites-list");
      const favA = favoritesList.locator(".task-item", { hasText: titleA });
      const favB = favoritesList.locator(".task-item", { hasText: titleB });
      await expect(favA).toBeVisible({ timeout: 10000 });
      await expect(favB).toBeVisible({ timeout: 10000 });

      // Before pinning: B is newest, so it sorts first.
      await expect.poll(async () => {
        const items = await favoritesList.locator(".task-item").all();
        const texts = await Promise.all(items.map((item) => item.textContent()));
        const idxA = texts.findIndex((t) => t?.includes(titleA));
        const idxB = texts.findIndex((t) => t?.includes(titleB));
        return idxB < idxA;
      }, { timeout: 10000 }).toBe(true);

      // Pin A → A bubbles above B.
      await favA.locator('[data-testid^="favorite-pin-"]').click();
      await expect(favA).toHaveAttribute("data-pinned", "true", {
        timeout: 10000,
      });
      await expect.poll(async () => {
        const items = await favoritesList.locator(".task-item").all();
        const texts = await Promise.all(items.map((item) => item.textContent()));
        const idxA = texts.findIndex((t) => t?.includes(titleA));
        const idxB = texts.findIndex((t) => t?.includes(titleB));
        return idxA < idxB;
      }, { timeout: 10000 }).toBe(true);

      // Unpin A → B (newer) is first again.
      await favA.locator('[data-testid^="favorite-pin-"]').click();
      await expect(favA).toHaveAttribute("data-pinned", "false", {
        timeout: 10000,
      });
      await expect.poll(async () => {
        const items = await favoritesList.locator(".task-item").all();
        const texts = await Promise.all(items.map((item) => item.textContent()));
        const idxA = texts.findIndex((t) => t?.includes(titleA));
        const idxB = texts.findIndex((t) => t?.includes(titleB));
        return idxB < idxA;
      }, { timeout: 10000 }).toBe(true);
    });
  });
}

for (const framework of REACTIVE_FRAMEWORKS) {
  test.describe(`${framework.name} sync-pack-counters`, () => {
    test("badge row renders three live counters", async ({ page }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText("Live", {
        timeout: 15000,
      });
      await expect(page.getByTestId("counters-pack-row")).toBeVisible();
      // Each counter resolves to a number (no "…" placeholder after hydrate).
      await expect(page.getByTestId("counter-openTasks")).toContainText(
        /\d+ open/,
        { timeout: 10000 },
      );
      await expect(page.getByTestId("counter-doneTasks")).toContainText(
        /\d+ done/,
        { timeout: 10000 },
      );
      await expect(page.getByTestId("counter-totalComments")).toContainText(
        /\d+ comments/,
        { timeout: 10000 },
      );
    });

    test("adding a task ticks the openTasks counter live (read-set tracking)", async ({
      page,
    }) => {
      await page.goto(framework.path);
      await expect(page.locator(".sync-status").first()).toContainText("Live", {
        timeout: 15000,
      });
      await expect(page.getByTestId("counter-openTasks")).toContainText(
        /\d+ open/,
        { timeout: 10000 },
      );

      const readOpen = async (): Promise<number> => {
        const text = await page.getByTestId("counter-openTasks").textContent();
        return Number(text?.match(/(\d+)/)?.[1] ?? 0);
      };
      const before = await readOpen();

      const title = uniqueTitle(`counter-${framework.name.toLowerCase()}`);
      await taskInput(page).first().fill(title);
      await taskInput(page).first().press("Enter");
      await expect(taskRow(page, title).first()).toBeVisible({
        timeout: 10000,
      });

      // The reactive query re-runs because the tasks table changed.
      await expect.poll(readOpen, { timeout: 10000 }).toBe(before + 1);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// All four reactive frameworks now subscribe to `comments-with-author`
// (sync-pack-comments 0.2+ join), so the byline should render a display
// name from the host's users table — "Guest XXXXXX" — instead of the
// previous uuid slice.
// ─────────────────────────────────────────────────────────────────────────────

for (const framework of REACTIVE_FRAMEWORKS) {
  test(`${framework.name} comments-with-author: byline renders the joined display name`, async ({
    page,
  }) => {
    await page.goto(framework.path);
    await expect(page.locator(".sync-status").first()).toContainText("Live", {
      timeout: 15000,
    });

    const body = uniqueComment(`byline-${framework.name.toLowerCase()}`);
    await postComment(page, body);

    const row = page
      .getByTestId("comments-list")
      .locator(".task-item", { hasText: body });
    await expect(row).toBeVisible();
    // The byline starts with "Guest " (followed by the first 6 chars of the
    // tab's stable userId). If the join regressed and we fell back to the
    // raw uuid slice, this would fail.
    await expect(row).toContainText(/Guest [0-9a-f]{6}/);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// sync-pack-mentions ↔ sync-pack-notifications — pack composition.
//
// The mentions pack parses `@username` from a comment body and writes per-
// actor mention rows; the host's `onMention` hook fires the notifications
// pack's `notify` mutation. The mentions pack never reaches into the
// notifications pack itself — the composition lives in the host's hook.
//
// This test proves the wiring end-to-end across two framework tabs:
//   1. B posts a comment so the page renders B's `@slug`.
//   2. A reads that slug, then posts a comment that mentions it.
//   3. B's notifications panel ticks up by one and contains "mentioned you".
// ─────────────────────────────────────────────────────────────────────────────
test("pack composition: @mention in comment fires a notification across frameworks", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto("/"); // React
  await b.goto("/vue"); // Vue — proves the composition is server-side, not framework-specific
  await expect(a.locator(".sync-status").first()).toContainText("Live", {
    timeout: 15000,
  });
  await expect(b.locator(".sync-status").first()).toContainText("Live", {
    timeout: 15000,
  });

  // B posts a comment so that B's @slug becomes visible on the page.
  const bMarker = uniqueComment("b-self");
  await postComment(b, bMarker);
  const bRow = b
    .getByTestId("comments-list")
    .locator(".task-item", { hasText: bMarker });
  await expect(bRow).toBeVisible({ timeout: 15000 });
  const bSlugText = (
    await bRow.locator('[data-testid^="comment-slug-"]').first().textContent()
  )?.trim();
  expect(bSlugText).toMatch(/^@[0-9a-f]{6}$/);
  const bSlug = bSlugText!.slice(1); // strip the @

  // The same row should have appeared in A's view too (cross-tab sync).
  await expect(
    a.getByTestId("comments-list").locator(".task-item", { hasText: bMarker }),
  ).toBeVisible({ timeout: 15000 });

  // Read B's current unread count, then have A post a comment mentioning
  // B's slug. B's notifications panel should tick up by 1.
  const readUnread = async (page: Page): Promise<number> => {
    const text = await page.getByTestId("notifications-unread-count").textContent();
    return Number(text?.match(/(\d+)/)?.[1] ?? 0);
  };
  // Make sure B is on the "all" tab so the new mention is included.
  await b.getByTestId("notifications-tab-all").click();
  const bBefore = await readUnread(b);

  const aBody = uniqueComment(`mention-${bSlug}`) + ` hey @${bSlug} look at this`;
  await postComment(a, aBody);

  // B sees its unread count tick up.
  await expect.poll(() => readUnread(b), { timeout: 15000 }).toBe(bBefore + 1);
  // And the newest notification mentions a slug-shaped title.
  await expect(b.getByTestId("notifications-list")).toContainText(
    /mentioned you/,
    { timeout: 15000 },
  );

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Code Mode for sync mutations (SB-1 worked example).
//
// The React page's CodeModePanel runs a JS body inside an isolated-jsc
// sandbox that's been seeded with engine mutations as host functions.
// Press Run with the default body — it creates a comment, toggles a
// reaction, and returns the new id. Test asserts the tool calls log,
// the result, and a comment row materializing in the live list.
// ─────────────────────────────────────────────────────────────────────────────
test("code-mode panel runs JS, fires host mutations, returns the value", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".sync-status").first()).toContainText("Live", {
    timeout: 15000,
  });
  await expect(page.getByTestId("code-mode-panel")).toBeVisible();

  const marker = `code-mode-marker-${Date.now()}`;
  const code = `const c = await comments_create({
  resourceId: 'shared-discussion',
  body: ${JSON.stringify(marker)},
});
await comments_toggleReaction({ commentId: c.id, emoji: '👍' });
log('done with', c.id);
return { commentId: c.id, body: c.body };`;
  await page.getByTestId("code-mode-input").fill(code);
  await page.getByTestId("code-mode-run").click();

  await expect(page.getByTestId("code-mode-status")).toContainText("ok", {
    timeout: 15000,
  });

  const toolCalls = page.getByTestId("code-mode-tool-calls");
  await expect(toolCalls).toContainText("comments_create");
  await expect(toolCalls).toContainText("comments_toggleReaction");
  await expect(page.getByTestId("code-mode-result")).toContainText(marker);

  // The created comment shows up in the live comments list — proves the
  // mutation actually committed through the engine, not just round-
  // tripped through the sandbox.
  await expect(
    page
      .getByTestId("comments-list")
      .locator(".task-item", { hasText: marker }),
  ).toBeVisible({ timeout: 15000 });
});

