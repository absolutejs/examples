<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import ConversationItem from "./ConversationItem.vue";

type ConversationSummary = {
  createdAt: number;
  id: string;
  lastMessageAt?: number;
  messageCount: number;
  title: string;
};

const props = defineProps<{
  activeConversationId: string | null;
  open: boolean;
}>();

const emit = defineEmits<{
  deleteConversation: [id: string];
  newChat: [];
  selectConversation: [id: string];
}>();

const POLL_INTERVAL = 3000;

const conversations = ref<ConversationSummary[]>([]);
let intervalId: ReturnType<typeof setInterval> | null = null;

const fetchConversations = async () => {
  try {
    const res = await fetch("/chat/conversations");
    const data = await res.json();
    conversations.value = data;
  } catch {
    // silently fail
  }
};

const handleDelete = async (evt: MouseEvent, conversationId: string) => {
  await fetch(`/chat/conversations/${conversationId}`, { method: "DELETE" });
  emit("deleteConversation", conversationId);
  await fetchConversations();
};

onMounted(() => {
  fetchConversations();
  intervalId = setInterval(fetchConversations, POLL_INTERVAL);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div :class="['sidebar', { open }]">
    <div class="sidebar-header">
      <span class="sidebar-title">Chats</span>
      <button
        class="new-chat-btn"
        title="New chat"
        type="button"
        @click="emit('newChat')"
      >
        <svg
          fill="none"
          height="16"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="16"
        >
          <line x1="12" x2="12" y1="5" y2="19" />
          <line x1="5" x2="19" y1="12" y2="12" />
        </svg>
      </button>
    </div>

    <div class="sidebar-list">
      <div v-if="conversations.length === 0" class="sidebar-empty">
        No conversations yet
      </div>
      <ConversationItem
        v-for="conv in conversations"
        :key="conv.id"
        :active="conv.id === activeConversationId"
        :conversation="conv"
        @delete="handleDelete"
        @select="emit('selectConversation', $event)"
      />
    </div>
  </div>
</template>
