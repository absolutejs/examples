import { Component, Input, Output, EventEmitter } from "@angular/core";
import { NgClass } from "@angular/common";
import {
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
  DAYS_PER_WEEK,
} from "../../../constants";

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
  templateUrl: "./conversation-item.html",
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
