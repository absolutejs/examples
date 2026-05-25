import { test, expect } from "@playwright/test";

// The chat defaults to the offline "mock" provider (no API key), and its store
// is the sync-backed conversation store. The "live mirror" panel is a second
// sync subscriber to the same conversation — so a message sent in the chat must
// appear in the mirror, live, fed entirely by the change feed.
test("a chat message streams to the sync-backed live mirror", async ({
  page,
}) => {
  await page.goto("/");

  const word = `zephyr${Date.now()}`;
  const input = page.locator('textarea[name="input"]');
  await input.fill(word);
  await input.press("Enter");

  // The mock assistant echoes the message in the chat.
  await expect(page.locator(".messages")).toContainText(`you said "${word}"`, {
    timeout: 20_000,
  });

  // The live mirror (a separate sync subscriber) shows the conversation live.
  const mirror = page.getByTestId("live-mirror");
  await expect(mirror).toBeVisible({ timeout: 15_000 });
  await expect(mirror).toContainText(word, { timeout: 15_000 });
});
