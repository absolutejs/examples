<script lang="ts">
  import {
    stripPrefix,
    calculateCost,
    formatCost,
    MS_PER_SECOND,
    COPY_FEEDBACK_MS,
  } from "../../constants";
  import type { ModelDef } from "../../models";
  import { renderMarkdown } from "../../utils/markdown";

  type ToolCall = {
    name: string;
    result?: string;
  };

  type Attachment = {
    data: string;
    media_type: string;
    name?: string;
  };

  type ImageData = {
    data: string;
    format: string;
    imageId?: string;
    isPartial?: boolean;
    revisedPrompt?: string;
  };

  type Usage = {
    inputTokens: number;
    outputTokens: number;
  };

  type Message = {
    attachments?: Attachment[];
    content: string;
    conversationId?: string;
    durationMs?: number;
    id: string;
    images?: ImageData[];
    isStreaming?: boolean;
    model?: string;
    role: "user" | "assistant" | "system";
    thinking?: string;
    toolCalls?: ToolCall[];
    usage?: Usage;
  };

  type MessageItemProps = {
    copiedId: string | null;
    message: Message;
    messageIndex: number;
    onCopy: (id: string, content: string) => void;
    onRetry: (idx: number) => void;
    selectedModel: ModelDef;
  };

  let {
    copiedId,
    message,
    messageIndex,
    onCopy,
    onRetry,
    selectedModel,
  }: MessageItemProps = $props();

  let renderedContent = $derived(
    message.content ? renderMarkdown(message.content) : "",
  );

  const getCost = (
    model: string,
    inputTokens: number,
    outputTokens: number,
  ) => {
    const cost = calculateCost(model, inputTokens, outputTokens);
    if (cost === null) return null;
    return formatCost(cost);
  };

  let showTypingIndicator = $derived(
    message.role === "assistant" &&
      message.isStreaming &&
      !message.content &&
      !(message.images && message.images.length > 0),
  );

  let durationFormatted = $derived.by(() => {
    if (message.durationMs === undefined) return null;
    return message.durationMs < MS_PER_SECOND
      ? `${message.durationMs}ms`
      : `${(message.durationMs / MS_PER_SECOND).toFixed(1)}s`;
  });

  let costFormatted = $derived.by(() => {
    if (!message.usage) return null;
    return getCost(
      message.model ?? selectedModel.id,
      message.usage.inputTokens,
      message.usage.outputTokens,
    );
  });
</script>

<div class="message" data-role={message.role}>
  {#if message.role === "assistant"}
    <!-- Tool calls -->
    {#if message.toolCalls && message.toolCalls.length > 0}
      <div class="tool-calls">
        {#each message.toolCalls as tool (`${message.id}-${tool.name}`)}
          <details class="tool-call">
            <summary class={tool.result ? "done" : "running"}>
              <span class="tool-icon">{tool.result ? "\u2713" : "\u27F3"}</span>
              {tool.name}
              <span class="tool-label"
                >{tool.result ? "completed" : "running..."}</span
              >
            </summary>
            {#if tool.result}
              <pre class="tool-result">{tool.result}</pre>
            {/if}
          </details>
        {/each}
      </div>
    {/if}

    <!-- Thinking -->
    {#if message.thinking}
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
          {message.isStreaming && !message.content
            ? "Thinking..."
            : "Thought process"}
        </summary>
        <div class="thinking-content">{message.thinking}</div>
      </details>
    {/if}

    <!-- Generated images -->
    {#if message.images && message.images.length > 0}
      <div class="generated-images">
        {#each message.images as img, idx (img.imageId ?? idx)}
          <div class="generated-image" class:loading={img.isPartial}>
            <img
              alt={img.revisedPrompt ?? "Generated image"}
              src="data:image/{img.format};base64,{img.data}"
            />
            {#if img.isPartial}
              <div class="image-loading-overlay"></div>
            {/if}
            {#if img.revisedPrompt && !img.isPartial}
              <p class="revised-prompt">{img.revisedPrompt}</p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Body -->
    {#if showTypingIndicator}
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    {:else if message.content}
      <div class="markdown">
        {@html renderedContent}
      </div>
    {/if}

    <!-- Usage badge -->
    {#if !message.isStreaming && message.content}
      <div class="usage-badge">
        {#if message.model}
          <span class="usage-item model-tag">{message.model}</span>
        {/if}
        {#if durationFormatted}
          <span class="usage-item">
            <span class="usage-label">time</span>
            {durationFormatted}
          </span>
        {/if}
        {#if message.usage}
          <span class="usage-item">
            <span class="usage-label">in</span>
            {message.usage.inputTokens.toLocaleString()} tokens
          </span>
          <span class="usage-item">
            <span class="usage-label">out</span>
            {message.usage.outputTokens.toLocaleString()} tokens
          </span>
          {#if costFormatted}
            <span class="usage-item">
              <span class="usage-label">cost</span>
              {costFormatted}
            </span>
          {/if}
        {/if}
        <div class="message-actions">
          <button
            class="action-btn"
            onclick={() => onCopy(message.id, message.content)}
            title="Copy response"
            type="button"
          >
            {#if copiedId === message.id}
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
            {:else}
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
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            {/if}
          </button>
          <button
            class="action-btn"
            onclick={() => onRetry(messageIndex)}
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
    {/if}
  {:else if message.role === "user"}
    <!-- User attachments -->
    {#if message.attachments && message.attachments.length > 0}
      <div class="message-images">
        {#each message.attachments as att, idx (idx)}
          {#if att.media_type === "application/pdf"}
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
              {att.name ?? "document.pdf"}
            </div>
          {:else}
            <img
              alt={att.name ?? "attachment"}
              class="message-image"
              src="data:{att.media_type};base64,{att.data}"
            />
          {/if}
        {/each}
      </div>
    {/if}
    <span>{stripPrefix(message.content)}</span>
  {/if}
</div>
