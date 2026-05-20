import { Component, Input, Output, EventEmitter, signal } from "@angular/core";
import { NgClass } from "@angular/common";
import {
  ConversationItemComponent,
  type ConversationSummary,
} from "./conversation-item.component";

const POLL_INTERVAL = 3000;

@Component({
  imports: [NgClass, ConversationItemComponent],
  selector: "app-sidebar",
  standalone: true,
  template: `
    <div class="sidebar" [ngClass]="{ open: open }">
      <div class="sidebar-header">
        <span class="sidebar-title">Chats</span>
        <button
          class="new-chat-btn"
          (click)="newChat.emit()"
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
        @if (conversations().length === 0) {
          <div class="sidebar-empty">No conversations yet</div>
        }
        @for (conv of conversations(); track conv.id) {
          <app-conversation-item
            [conversation]="conv"
            [active]="conv.id === activeConversationId"
            (selectConversation)="selectConversation.emit($event)"
            (deleteConversation)="handleDelete($event)"
          />
        }
      </div>
    </div>
  `,
})
export class SidebarComponent {
  @Input() open = false;
  @Input() activeConversationId: string | null = null;
  @Output() newChat = new EventEmitter<void>();
  @Output() selectConversation = new EventEmitter<string>();
  @Output() deleteConversation = new EventEmitter<string>();

  conversations = signal<ConversationSummary[]>([]);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    if (typeof window === "undefined") return;
    this.fetchConversations();
    this.intervalId = setInterval(
      () => this.fetchConversations(),
      POLL_INTERVAL,
    );
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  async fetchConversations() {
    try {
      const res = await fetch("/chat/conversations");
      const data = await res.json();
      this.conversations.set(data);
    } catch {
      // silently fail
    }
  }

  async handleDelete(evt: { event: MouseEvent; id: string }) {
    await fetch(`/chat/conversations/${evt.id}`, { method: "DELETE" });
    this.deleteConversation.emit(evt.id);
    await this.fetchConversations();
  }
}
