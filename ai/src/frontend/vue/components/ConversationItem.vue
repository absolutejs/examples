<script setup lang="ts">
import {
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
  DAYS_PER_WEEK,
} from "../../constants";

type ConversationSummary = {
  createdAt: number;
  id: string;
  lastMessageAt?: number;
  messageCount: number;
  title: string;
};

const props = defineProps<{
  active: boolean;
  conversation: ConversationSummary;
}>();

const emit = defineEmits<{
  delete: [evt: MouseEvent, id: string];
  select: [id: string];
}>();

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
  const diffHours = Math.floor(diffMs / MS_PER_HOUR);
  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffMins < 1) return "just now";
  if (diffMins < MINUTES_PER_HOUR) return `${diffMins}m ago`;
  if (diffHours < HOURS_PER_DAY) return `${diffHours}h ago`;
  if (diffDays < DAYS_PER_WEEK) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};
</script>

<template>
  <div
    :class="['sidebar-item', { active }]"
    role="button"
    tabindex="0"
    @click="emit('select', conversation.id)"
  >
    <div class="sidebar-item-title">{{ conversation.title }}</div>
    <div class="sidebar-item-meta">
      {{ conversation.messageCount }} messages &middot;
      {{ formatTime(conversation.lastMessageAt ?? conversation.createdAt) }}
    </div>
    <button
      class="sidebar-item-delete"
      title="Delete conversation"
      type="button"
      @click.stop="emit('delete', $event, conversation.id)"
    >
      <svg
        fill="none"
        height="12"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="12"
      >
        <line x1="18" x2="6" y1="6" y2="18" />
        <line x1="6" x2="18" y1="6" y2="18" />
      </svg>
    </button>
  </div>
</template>
