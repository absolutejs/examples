import { useState, useEffect, useCallback, type MouseEvent } from "react";
import { ConversationItem } from "./ConversationItem";

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

const POLL_INTERVAL = 3000;

export const Sidebar = ({
  activeConversationId,
  onDeleteConversation,
  onNewChat,
  onSelectConversation,
  open,
}: SidebarProps) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/chat/conversations");
      const data = await res.json();
      setConversations(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchConversations]);

  const handleDelete = async (evt: MouseEvent, conversationId: string) => {
    evt.stopPropagation();
    await fetch(`/chat/conversations/${conversationId}`, { method: "DELETE" });
    onDeleteConversation(conversationId);
    await fetchConversations();
  };

  return (
    <div className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">Chats</span>
        <button
          className="new-chat-btn"
          onClick={onNewChat}
          title="New chat"
          type="button"
        >
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
        </button>
      </div>

      <div className="sidebar-list">
        {conversations.length === 0 && (
          <div className="sidebar-empty">No conversations yet</div>
        )}
        {conversations.map((conv) => (
          <ConversationItem
            active={conv.id === activeConversationId}
            conversation={conv}
            key={conv.id}
            onDelete={handleDelete}
            onSelect={onSelectConversation}
          />
        ))}
      </div>
    </div>
  );
};
