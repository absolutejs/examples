<script lang="ts">
  import ConversationItem from "./ConversationItem.svelte";

  type ConversationSummary = {
    createdAt: number;
    id: string;
    lastMessageAt?: number;
    messageCount: number;
    title: string;
  };

  type SidebarProps = {
    activeConversationId: string | null;
    onDeleteConversation: (id: string) => void;
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    open: boolean;
  };

  let {
    activeConversationId,
    onDeleteConversation,
    onNewChat,
    onSelectConversation,
    open,
  }: SidebarProps = $props();

  let conversations = $state<ConversationSummary[]>([]);

  const POLL_INTERVAL = 3000;

  const fetchConversations = async () => {
    try {
      const res = await fetch("/chat/conversations");
      const data = await res.json();
      conversations = data;
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (evt: MouseEvent, conversationId: string) => {
    evt.stopPropagation();
    await fetch(`/chat/conversations/${conversationId}`, { method: "DELETE" });
    onDeleteConversation(conversationId);
    await fetchConversations();
  };

  $effect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, POLL_INTERVAL);
    return () => clearInterval(interval);
  });
</script>

<div class="sidebar" class:open>
  <div class="sidebar-header">
    <span class="sidebar-title">Chats</span>
    <button
      class="new-chat-btn"
      onclick={onNewChat}
      title="New chat"
      type="button"
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
    {#if conversations.length === 0}
      <div class="sidebar-empty">No conversations yet</div>
    {/if}
    {#each conversations as conv (conv.id)}
      <ConversationItem
        active={conv.id === activeConversationId}
        conversation={conv}
        onDelete={handleDelete}
        onSelect={onSelectConversation}
      />
    {/each}
  </div>
</div>
