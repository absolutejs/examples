import { Component, Input, Output, EventEmitter } from "@angular/core";
import { NgClass } from "@angular/common";
import {
  stripPrefix,
  calculateCost,
  formatCost,
  MS_PER_SECOND,
} from "../../../constants";
import type { AIMessage } from "@absolutejs/ai";
import type { ModelDef } from "../../../models";
import { renderMarkdown } from "../../../utils/markdown";

@Component({
  imports: [NgClass],
  selector: "app-message-item",
  standalone: true,
  templateUrl: "./message-item.html",
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
