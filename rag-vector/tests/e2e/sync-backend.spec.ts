import { test, expect } from "@playwright/test";

// The "sync" backend (createSyncRAGStore) serves the standard RAG flow AND a
// live retrieval collection over the sync engine — mounted on the rag service
// and proxied by the web. The React page renders a live-retrieval card for it.
test("sync backend: live retrieval re-ranks as documents are ingested", async ({
  page,
}) => {
  await page.goto("/react/sync");

  // The live-retrieval card only renders for the sync backend, so its presence
  // confirms the backend mode is wired end to end.
  const card = page.getByTestId("sync-live-retrieval");
  await expect(card).toBeVisible({ timeout: 30_000 });

  // Subscribe to a unique query first (no matches yet), then ingest a matching
  // document — the result must appear live, proxied web → rag over the socket.
  const word = `zephyr${Date.now()}`;
  await card.getByLabel("Live retrieval query").fill(word);

  const ingest = card.getByLabel("Ingest document (sync)");
  await ingest.fill(`an internal note about ${word} energy systems`);
  await card.getByRole("button", { name: "Ingest" }).click();

  await expect(
    page.getByTestId("sync-live-results").getByText(word, { exact: false }),
  ).toBeVisible({ timeout: 15_000 });
});
