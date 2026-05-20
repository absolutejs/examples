import {
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
  DAYS_PER_WEEK,
} from "../../constants";
import type { MouseEvent } from "react";

type ConversationSummary = {
  createdAt: number;
  id: string;
  lastMessageAt?: number;
  messageCount: number;
  title: string;
};

type ConversationItemProps = {
  active: boolean;
  conversation: ConversationSummary;
  onDelete: (evt: MouseEvent, id: string) => void;
  onSelect: (id: string) => void;
};

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

export const ConversationItem = ({
  active,
  conversation,
  onDelete,
  onSelect,
}: ConversationItemProps) => (
  <div
    className={`sidebar-item ${active ? "active" : ""}`}
    onClick={() => onSelect(conversation.id)}
    role="button"
    tabIndex={0}
  >
    <div className="sidebar-item-title">{conversation.title}</div>
    <div className="sidebar-item-meta">
      {conversation.messageCount} messages ·{" "}
      {formatTime(conversation.lastMessageAt ?? conversation.createdAt)}
    </div>
    <button
      className="sidebar-item-delete"
      onClick={(evt) => onDelete(evt, conversation.id)}
      title="Delete conversation"
      type="button"
    >
      <svg
        fill="none"
        height="12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="12"
      >
        <line x1="18" x2="6" y1="6" y2="18" />
        <line x1="6" x2="18" y1="6" y2="18" />
      </svg>
    </button>
  </div>
);
