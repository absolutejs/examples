<script setup lang="ts">
import { computed } from "vue";
import { useSyncCollection } from "@absolutejs/sync/vue";

type CommentReactionRow = {
  id: string;
  commentId: string;
  actorId: string;
  emoji: string;
  createdAt: number;
};

const props = defineProps<{
  commentId: string;
  wsUrl: string;
  myUserId: string;
}>();

const REACTION_PALETTE = ["👍", "❤️", "🎉"] as const;

const { data } = useSyncCollection<CommentReactionRow>({
  collection: "comment_reactions",
  params: { commentId: props.commentId },
  url: props.wsUrl,
});

const counts = computed(() => {
  const map = new Map<string, number>();
  for (const row of data.value) {
    map.set(row.emoji, (map.get(row.emoji) ?? 0) + 1);
  }

  return map;
});

const mine = computed(() => {
  const set = new Set<string>();
  for (const row of data.value) {
    if (row.actorId === props.myUserId) set.add(row.emoji);
  }

  return set;
});

const toggle = (emoji: string) =>
  void fetch("/sync/comments/toggleReaction", {
    body: JSON.stringify({
      commentId: props.commentId,
      emoji,
      userId: props.myUserId,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
</script>

<template>
  <span :data-testid="`comment-reactions-${commentId}`">
    <button
      v-for="emoji in REACTION_PALETTE"
      :key="emoji"
      :data-testid="`reaction-${commentId}-${emoji}`"
      type="button"
      :style="{
        background: mine.has(emoji)
          ? 'rgba(99, 102, 241, 0.15)'
          : 'transparent',
        border: '1px solid',
        borderColor: mine.has(emoji) ? '#6366f1' : 'rgba(255,255,255,0.15)',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '0.9em',
        marginRight: '4px',
        padding: '0 6px',
      }"
      @click="toggle(emoji)"
    >
      {{ emoji }} {{ counts.get(emoji) ?? 0 }}
    </button>
  </span>
</template>
