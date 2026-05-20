<script setup lang="ts">
import { computed } from "vue";
import {
  stripPrefix,
  calculateCost,
  formatCost,
  MS_PER_SECOND,
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

const props = defineProps<{
  copiedId: string | null;
  message: Message;
  messageIndex: number;
  selectedModel: ModelDef;
}>();

const emit = defineEmits<{
  copy: [id: string, content: string];
  retry: [idx: number];
}>();

const renderedContent = computed(() =>
  props.message.content ? renderMarkdown(props.message.content) : "",
);

const showTypingIndicator = computed(
  () =>
    props.message.isStreaming &&
    !props.message.content &&
    !(props.message.images && props.message.images.length > 0),
);

const thinkingLabel = computed(() =>
  props.message.isStreaming && !props.message.content
    ? "Thinking..."
    : "Thought process",
);

const showUsageBadge = computed(
  () =>
    !props.message.isStreaming &&
    props.message.content &&
    props.message.role === "assistant",
);

const formattedDuration = computed(() => {
  if (props.message.durationMs === undefined) return null;
  return props.message.durationMs < MS_PER_SECOND
    ? `${props.message.durationMs}ms`
    : `${(props.message.durationMs / MS_PER_SECOND).toFixed(1)}s`;
});

const costDisplay = computed(() => {
  if (!props.message.usage) return null;
  const model = props.message.model ?? props.selectedModel.id;
  const cost = calculateCost(
    model,
    props.message.usage.inputTokens,
    props.message.usage.outputTokens,
  );
  if (cost === null) return null;
  return formatCost(cost);
});
</script>

<template>
  <div class="message" :data-role="message.role">
    <!-- User content -->
    <template v-if="message.role === 'user'">
      <div
        v-if="message.attachments && message.attachments.length > 0"
        class="message-images"
      >
        <template v-for="(att, idx) in message.attachments" :key="idx">
          <div v-if="att.media_type === 'application/pdf'" class="message-pdf">
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
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {{ att.name ?? "document.pdf" }}
          </div>
          <img
            v-else
            :alt="att.name ?? 'attachment'"
            class="message-image"
            :src="`data:${att.media_type};base64,${att.data}`"
          />
        </template>
      </div>
      <span>{{ stripPrefix(message.content) }}</span>
    </template>

    <!-- Assistant content -->
    <template v-if="message.role === 'assistant'">
      <!-- Tool calls -->
      <div
        v-if="message.toolCalls && message.toolCalls.length > 0"
        class="tool-calls"
      >
        <details
          v-for="tool in message.toolCalls"
          :key="`${message.id}-${tool.name}`"
          class="tool-call"
        >
          <summary :class="tool.result ? 'done' : 'running'">
            <span class="tool-icon">{{
              tool.result ? "\u2713" : "\u27F3"
            }}</span>
            {{ tool.name }}
            <span class="tool-label">{{
              tool.result ? "completed" : "running..."
            }}</span>
          </summary>
          <pre v-if="tool.result" class="tool-result">{{ tool.result }}</pre>
        </details>
      </div>

      <!-- Thinking block -->
      <details v-if="message.thinking" class="thinking-block">
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
          {{ thinkingLabel }}
        </summary>
        <div class="thinking-content">{{ message.thinking }}</div>
      </details>

      <!-- Generated images -->
      <div
        v-if="message.images && message.images.length > 0"
        class="generated-images"
      >
        <div
          v-for="(img, idx) in message.images"
          :key="img.imageId ?? idx"
          :class="['generated-image', { loading: img.isPartial }]"
        >
          <img
            :alt="img.revisedPrompt ?? 'Generated image'"
            :src="`data:image/${img.format};base64,${img.data}`"
          />
          <div v-if="img.isPartial" class="image-loading-overlay" />
          <p v-if="img.revisedPrompt && !img.isPartial" class="revised-prompt">
            {{ img.revisedPrompt }}
          </p>
        </div>
      </div>

      <!-- Body: typing indicator or markdown -->
      <div v-if="showTypingIndicator" class="typing-indicator">
        <span /><span /><span />
      </div>
      <div
        v-else-if="message.content"
        class="markdown"
        v-html="renderedContent"
      />

      <!-- Usage badge -->
      <div v-if="showUsageBadge" class="usage-badge">
        <span v-if="message.model" class="usage-item model-tag">{{
          message.model
        }}</span>
        <span v-if="formattedDuration !== null" class="usage-item">
          <span class="usage-label">time</span>
          {{ formattedDuration }}
        </span>
        <template v-if="message.usage">
          <span class="usage-item">
            <span class="usage-label">in</span>
            {{ message.usage.inputTokens.toLocaleString() }} tokens
          </span>
          <span class="usage-item">
            <span class="usage-label">out</span>
            {{ message.usage.outputTokens.toLocaleString() }} tokens
          </span>
          <span v-if="costDisplay" class="usage-item">
            <span class="usage-label">cost</span>
            {{ costDisplay }}
          </span>
        </template>

        <!-- Actions -->
        <div class="message-actions">
          <button
            class="action-btn"
            title="Copy response"
            type="button"
            @click="emit('copy', message.id, message.content)"
          >
            <svg
              v-if="copiedId === message.id"
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
            <svg
              v-else
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
          </button>
          <button
            class="action-btn"
            title="Retry with same prompt"
            type="button"
            @click="emit('retry', messageIndex)"
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
    </template>
  </div>
</template>
