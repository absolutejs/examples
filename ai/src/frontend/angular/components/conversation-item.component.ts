import { Component, Input, Output, EventEmitter } from "@angular/core";
import { NgClass } from "@angular/common";
import {
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
  DAYS_PER_WEEK,
} from "../../constants";

export type ConversationSummary = {
  createdAt: number;
  id: string;
  lastMessageAt?: number;
  messageCount: number;
  title: string;
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

@Component({
  imports: [NgClass],
  selector: "app-conversation-item",
  standalone: true,
  template: `
    <div
      class="sidebar-item"
      [ngClass]="{ active: active }"
      (click)="selectConversation.emit(conversation.id)"
      role="button"
      tabindex="0"
    >
      <div class="sidebar-item-title">{{ conversation.title }}</div>
      <div class="sidebar-item-meta">
        {{ conversation.messageCount }} messages &middot;
        {{ formatTime(conversation.lastMessageAt ?? conversation.createdAt) }}
      </div>
      <button
        class="sidebar-item-delete"
        (click)="onDeleteClick($event)"
        title="Delete conversation"
        type="button"
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
  `,
})
export class ConversationItemComponent {
  @Input() conversation: ConversationSummary = {
    createdAt: 0,
    id: "",
    messageCount: 0,
    title: "",
  };
  @Input() active = false;
  @Output() selectConversation = new EventEmitter<string>();
  @Output() deleteConversation = new EventEmitter<{
    event: MouseEvent;
    id: string;
  }>();

  formatTime = formatTime;

  onDeleteClick(evt: MouseEvent) {
    evt.stopPropagation();
    this.deleteConversation.emit({ event: evt, id: this.conversation.id });
  }
}
