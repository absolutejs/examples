import { Component, Input, Output, EventEmitter } from "@angular/core";
import { NgClass } from "@angular/common";
import {
  stripPrefix,
  calculateCost,
  formatCost,
  MS_PER_SECOND,
} from "../../constants";
import type { AIMessage } from "@absolutejs/ai";
import type { ModelDef } from "../../models";
import { renderMarkdown } from "../../utils/markdown";

@Component({
  imports: [NgClass],
  selector: "app-message-item",
  standalone: true,
  template: `
    <div class="message" [attr.data-role]="message.role">
      @if (message.role === "assistant") {
        <!-- Tool calls -->
        @if (message.toolCalls && message.toolCalls.length > 0) {
          <div class="tool-calls">
            @for (tool of message.toolCalls; track tool.name) {
              <details class="tool-call">
                <summary [ngClass]="tool.result ? 'done' : 'running'">
                  <span class="tool-icon">{{ tool.result ? "✓" : "⟳" }}</span>
                  {{ tool.name }}
                  <span class="tool-label">{{
                    tool.result ? "completed" : "running..."
                  }}</span>
                </summary>
                @if (tool.result) {
                  <pre class="tool-result">{{ tool.result }}</pre>
                }
              </details>
            }
          </div>
        }

        <!-- Thinking block -->
        @if (message.thinking) {
          <details class="thinking-block">
            <summary>
              <svg
                fill="none"
                height="14"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="14"
              >
                <path
                  d="M12 2a8 8 0 00-3.5 15.2V19a1 1 0 001 1h5a1 1 0 001-1v-1.8A8 8 0 0012 2z"
                />
              </svg>
              {{
                message.isStreaming && !message.content
                  ? "Thinking..."
                  : "Thought process"
              }}
            </summary>
            <div class="thinking-content">{{ message.thinking }}</div>
          </details>
        }

        <!-- Generated images -->
        @if (message.images && message.images.length > 0) {
          <div class="generated-images">
            @for (img of message.images; track img.imageId ?? $index) {
              <div
                class="generated-image"
                [ngClass]="{ loading: img.isPartial }"
              >
                <img
                  [alt]="img.revisedPrompt ?? 'Generated image'"
                  [src]="'data:image/' + img.format + ';base64,' + img.data"
                />
                @if (img.isPartial) {
                  <div class="image-loading-overlay"></div>
                }
                @if (img.revisedPrompt && !img.isPartial) {
                  <p class="revised-prompt">{{ img.revisedPrompt }}</p>
                }
              </div>
            }
          </div>
        }

        <!-- Assistant body -->
        @if (
          message.isStreaming &&
          !message.content &&
          !(message.images && message.images.length > 0)
        ) {
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        } @else if (message.content) {
          <div class="markdown" [innerHTML]="markdownContent"></div>
        }

        <!-- Usage badge -->
        @if (!message.isStreaming && message.content) {
          <div class="usage-badge">
            @if (message.model) {
              <span class="usage-item model-tag">{{ message.model }}</span>
            }
            @if (message.durationMs !== undefined) {
              <span class="usage-item">
                <span class="usage-label">time</span>
                {{ formatDuration(message.durationMs) }}
              </span>
            }
            @if (message.usage) {
              <span class="usage-item">
                <span class="usage-label">in</span>
                {{ message.usage.inputTokens.toLocaleString() }} tokens
              </span>
              <span class="usage-item">
                <span class="usage-label">out</span>
                {{ message.usage.outputTokens.toLocaleString() }} tokens
              </span>
              @if (
                getCost(
                  message.model,
                  message.usage.inputTokens,
                  message.usage.outputTokens
                ) !== null
              ) {
                <span class="usage-item">
                  <span class="usage-label">cost</span>
                  {{
                    formatCostValue(
                      getCost(
                        message.model,
                        message.usage.inputTokens,
                        message.usage.outputTokens
                      )
                    )
                  }}
                </span>
              }
            }
            <div class="message-actions">
              <button
                class="action-btn"
                (click)="
                  copyMessage.emit({
                    id: message.id,
                    content: message.content,
                  })
                "
                title="Copy response"
                type="button"
              >
                @if (copiedId === message.id) {
                  <svg
                    fill="none"
                    height="14"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    width="14"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                } @else {
                  <svg
                    fill="none"
                    height="14"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    width="14"
                  >
                    <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
                    <path
                      d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                    />
                  </svg>
                }
              </button>
              <button
                class="action-btn"
                (click)="retryMessage.emit(messageIndex)"
                title="Retry with same prompt"
                type="button"
              >
                <svg
                  fill="none"
                  height="14"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  width="14"
                >
                  <path d="M1 4v6h6" />
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
              </button>
            </div>
          </div>
        }
      }

      @if (message.role === "user") {
        <!-- User attachments -->
        @if (message.attachments && message.attachments.length > 0) {
          <div class="message-images">
            @for (att of message.attachments; track $index) {
              @if (att.media_type === "application/pdf") {
                <div class="message-pdf">
                  <svg
                    fill="none"
                    height="16"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                    width="16"
                  >
                    <path
                      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                    />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {{ att.name ?? "document.pdf" }}
                </div>
              } @else {
                <img
                  [alt]="att.name ?? 'attachment'"
                  class="message-image"
                  [src]="'data:' + att.media_type + ';base64,' + att.data"
                />
              }
            }
          </div>
        }
        <span>{{ cleanContent(message.content) }}</span>
      }
    </div>
  `,
})
export class MessageItemComponent {
  @Input() message: AIMessage = {
    content: "",
    conversationId: "",
    id: "",
    role: "user",
    timestamp: 0,
  };
  @Input() messageIndex = 0;
  @Input() copiedId: string | null = null;
  @Input() selectedModel: ModelDef = {
    capabilities: [],
    cost: "free",
    description: "",
    id: "",
    name: "",
    provider: "openai",
  };
  @Output() copyMessage = new EventEmitter<{
    id: string;
    content: string;
  }>();
  @Output() retryMessage = new EventEmitter<number>();

  cleanContent = stripPrefix;

  get markdownContent() {
    return renderMarkdown(this.message.content);
  }

  formatDuration(durationMs: number) {
    return durationMs < MS_PER_SECOND
      ? `${durationMs}ms`
      : `${(durationMs / MS_PER_SECOND).toFixed(1)}s`;
  }

  getCost(
    model: string | undefined,
    inputTokens: number,
    outputTokens: number,
  ) {
    return calculateCost(
      model ?? this.selectedModel.id,
      inputTokens,
      outputTokens,
    );
  }

  formatCostValue = (cost: number | null) => formatCost(cost ?? 0);
}
