<script lang="ts">
  import { onDestroy } from "svelte";
  import { createSyncCollectionStore } from "@absolutejs/sync/svelte";

  type CommentReactionRow = {
    id: string;
    commentId: string;
    actorId: string;
    emoji: string;
    createdAt: number;
  };

  const {
    commentId,
    wsUrl,
    myUserId,
  }: { commentId: string; wsUrl: string; myUserId: string } = $props();

  const REACTION_PALETTE = ["👍", "❤️", "🎉"] as const;

  const reactionsStore = createSyncCollectionStore<CommentReactionRow>({
    collection: "comment_reactions",
    params: { commentId },
    url: wsUrl,
  });
  onDestroy(() => reactionsStore.destroy());

  const counts = $derived(() => {
    const map = new Map<string, number>();
    for (const row of $reactionsStore.data) {
      map.set(row.emoji, (map.get(row.emoji) ?? 0) + 1);
    }

    return map;
  });

  const mine = $derived(() => {
    const set = new Set<string>();
    for (const row of $reactionsStore.data) {
      if (row.actorId === myUserId) set.add(row.emoji);
    }

    return set;
  });

  const toggle = (emoji: string) =>
    void fetch("/sync/comments/toggleReaction", {
      body: JSON.stringify({ commentId, emoji, userId: myUserId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
</script>

<span data-testid={`comment-reactions-${commentId}`}>
  {#each REACTION_PALETTE as emoji (emoji)}
    {@const isMine = mine().has(emoji)}
    <button
      data-testid={`reaction-${commentId}-${emoji}`}
      onclick={() => toggle(emoji)}
      style="background: {isMine
        ? 'rgba(99, 102, 241, 0.15)'
        : 'transparent'}; border: 1px solid {isMine
        ? '#6366f1'
        : 'rgba(255,255,255,0.15)'}; border-radius: 12px; cursor: pointer; font-size: 0.9em; margin-right: 4px; padding: 0 6px;"
      type="button">{emoji} {counts().get(emoji) ?? 0}</button
    >
  {/each}
</span>
