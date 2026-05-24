import { Component, Input, Output, EventEmitter, signal } from "@angular/core";
import { NgClass } from "@angular/common";
import {
  ConversationItemComponent,
  type ConversationSummary,
} from "../conversation-item/conversation-item";

const POLL_INTERVAL = 3000;

@Component({
  imports: [NgClass, ConversationItemComponent],
  selector: "app-sidebar",
  standalone: true,
  templateUrl: "./sidebar.html",
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
