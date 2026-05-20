<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useAIStream } from "@absolutejs/ai/vue";
import { COPY_FEEDBACK_MS, stripPrefix } from "../../constants";
import { MODELS, type ModelDef } from "../../models";
import ChatInput from "./ChatInput.vue";
import EmptyState from "./EmptyState.vue";
import MessageItem from "./MessageItem.vue";
import Sidebar from "./Sidebar.vue";

type MediaType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const isMediaType = (type: string): type is MediaType =>
  IMAGE_TYPES.includes(type) || type === "application/pdf";

type SuggestionCategoryDef = {
  icon: string;
  label: string;
  prompts: string[];
};

const SUGGESTIONS: SuggestionCategoryDef[] = [
  {
    icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.5.5-.1 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z",
    label: "Shop",
    prompts: [
      "What do you have under $50?",
      "Show me electronics",
      "Tell me about the mechanical keyboard",
    ],
  },
  {
    icon: "M12 2a8 8 0 00-3.5 15.2V19a1 1 0 001 1h5a1 1 0 001-1v-1.8A8 8 0 0012 2z",
    label: "Create",
    prompts: [
      "Generate an image of a sunset over mountains",
      "Write a product description for a new gadget",
      "Help me brainstorm gift ideas under $30",
    ],
  },
  {
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    label: "Explore",
    prompts: [
      "Compare the keyboard and the USB-C hub",
      "What's in stock in the kitchen category?",
      "Which products are best for a home office?",
    ],
  },
  {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    label: "Reason",
    prompts: [
      "Think step by step: what's the best value item?",
      "Analyze the full catalog and rank by category",
      "If I have $100, build me the ideal cart",
    ],
  },
];

const DEFAULT_MODEL =
  MODELS.find((mod) => mod.id === "claude-sonnet-4-6") ?? MODELS[0];

const selectedModel = ref<ModelDef>(DEFAULT_MODEL);
const sidebarOpen = ref(false);
const conversationId = ref<string | undefined>(undefined);
const copiedId = ref<string | null>(null);
const messagesEndRef = ref<HTMLDivElement | null>(null);
const appMainRef = ref<HTMLDivElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const pendingFiles = ref<
  Array<{
    data: string;
    media_type: MediaType;
    name: string;
    preview: string;
  }>
>([]);

const { messages, send, cancel, isStreaming, error } = useAIStream(
  "/chat",
  conversationId.value,
);

// Auto-scroll on new messages (only when user is near the bottom)
watch(messages, () => {
  nextTick(() => {
    if (appMainRef.value) {
      const { scrollTop, scrollHeight, clientHeight } = appMainRef.value;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom) {
        messagesEndRef.value?.scrollIntoView({ behavior: "smooth" });
      }
    }
  });
});

// Filter pending files when model changes
watch(selectedModel, (model) => {
  pendingFiles.value = pendingFiles.value.filter((file) => {
    if (file.media_type === "application/pdf")
      return model.capabilities.includes("pdf");
    return model.capabilities.includes("vision");
  });
});

const supportsVision = computed(() =>
  selectedModel.value.capabilities.includes("vision"),
);
const supportsPdf = computed(() =>
  selectedModel.value.capabilities.includes("pdf"),
);
const supportsAttachments = computed(
  () => supportsVision.value || supportsPdf.value,
);

const hasMessages = computed(() => messages.value.length > 0);

const activeConvId = computed(
  () =>
    conversationId.value ??
    (messages.value.length > 0 ? messages.value[0].conversationId : null) ??
    null,
);

const showWaitingIndicator = computed(
  () =>
    isStreaming.value &&
    messages.value.length > 0 &&
    messages.value[messages.value.length - 1].role === "user",
);

const processFiles = (files: FileList | File[]) => {
  for (const file of Array.from(files)) {
    const { type: fileType } = file;
    const isImage = IMAGE_TYPES.includes(fileType);
    const isPdf = fileType === "application/pdf";

    if (isImage && !supportsVision.value) continue;
    if (isPdf && !supportsPdf.value) continue;
    if (!isMediaType(fileType)) continue;

    const mediaType = fileType;
    const { name: fileName } = file;
    const reader = new FileReader();
    reader.onload = () => {
      const { result } = reader;
      if (typeof result !== "string") return;

      const [, base64] = result.split(",");

      pendingFiles.value = [
        ...pendingFiles.value,
        {
          data: base64,
          media_type: mediaType,
          name: fileName,
          preview: isImage ? result : "",
        },
      ];
    };
    reader.readAsDataURL(file);
  }
};

const removePendingFile = (idx: number) => {
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== idx);
};

const sendMessage = (text: string) => {
  const attachments =
    pendingFiles.value.length > 0
      ? pendingFiles.value.map(({ data, media_type, name }) => ({
          data,
          media_type,
          name,
        }))
      : undefined;

  send(
    `${selectedModel.value.provider}:${selectedModel.value.id}:${text}`,
    attachments,
  );
  pendingFiles.value = [];
};

const handleSubmit = (evt: Event) => {
  const form = evt.target as HTMLFormElement;
  const inputEl = form.elements.namedItem("input");

  if (!(inputEl instanceof HTMLTextAreaElement)) return;

  const value = inputEl.value.trim();
  if (!value) return;

  sendMessage(value);
  inputEl.value = "";
};

const handleCopy = async (msgId: string, content: string) => {
  await navigator.clipboard.writeText(content);
  copiedId.value = msgId;
  setTimeout(() => (copiedId.value = null), COPY_FEEDBACK_MS);
};

const handleRetry = (msgIdx: number) => {
  const prevUserMsg = messages.value
    .slice(0, msgIdx)
    .reverse()
    .find((msg) => msg.role === "user");

  if (!prevUserMsg) return;

  sendMessage(stripPrefix(prevUserMsg.content));
};

const handleNewChat = () => {
  conversationId.value = crypto.randomUUID();
};

const handleSelectConversation = (selectedId: string) => {
  conversationId.value = selectedId;
  sidebarOpen.value = false;
};

const handleDeleteConversation = (deletedId: string) => {
  if (activeConvId.value === deletedId) {
    conversationId.value = crypto.randomUUID();
  }
};

const handleFileInputChange = (evt: Event) => {
  const target = evt.target as HTMLInputElement;
  if (target.files) processFiles(target.files);
  target.value = "";
};

const fileAccept = computed(() => {
  const types: string[] = [];
  if (supportsVision.value)
    types.push("image/png", "image/jpeg", "image/gif", "image/webp");
  if (supportsPdf.value) types.push("application/pdf");
  return types.join(",");
});

defineExpose({ sidebarOpen });
</script>

<template>
  <div class="app-layout">
    <Sidebar
      :active-conversation-id="activeConvId"
      :open="sidebarOpen"
      @delete-conversation="handleDeleteConversation"
      @new-chat="handleNewChat"
      @select-conversation="handleSelectConversation"
    />
    <div ref="appMainRef" class="app-main">
      <div :class="['chat-container', { 'has-messages': hasMessages }]">
        <template v-if="!hasMessages">
          <EmptyState :suggestions="SUGGESTIONS" @send-message="sendMessage">
            <ChatInput
              :file-input-ref="fileInputRef"
              :has-messages="false"
              :is-streaming="isStreaming"
              :pending-files="pendingFiles"
              :selected-model="selectedModel"
              :supports-attachments="supportsAttachments"
              :supports-pdf="supportsPdf"
              :supports-vision="supportsVision"
              @cancel="cancel"
              @process-files="processFiles"
              @remove-file="removePendingFile"
              @select-model="(model: ModelDef) => (selectedModel = model)"
              @submit="handleSubmit"
            />
          </EmptyState>
        </template>
        <template v-else>
          <div class="messages">
            <MessageItem
              v-for="(msg, idx) in messages"
              :key="msg.id"
              :copied-id="copiedId"
              :message="msg"
              :message-index="idx"
              :selected-model="selectedModel"
              @copy="handleCopy"
              @retry="handleRetry"
            />
            <div
              v-if="showWaitingIndicator"
              class="message"
              data-role="assistant"
            >
              <div class="typing-indicator"><span /><span /><span /></div>
            </div>
            <div ref="messagesEndRef" />
          </div>
          <div v-if="error" class="error-banner">Error: {{ error }}</div>
          <ChatInput
            :file-input-ref="fileInputRef"
            :has-messages="true"
            :is-streaming="isStreaming"
            :pending-files="pendingFiles"
            :selected-model="selectedModel"
            :supports-attachments="supportsAttachments"
            :supports-pdf="supportsPdf"
            :supports-vision="supportsVision"
            @cancel="cancel"
            @process-files="processFiles"
            @remove-file="removePendingFile"
            @select-model="(model: ModelDef) => (selectedModel = model)"
            @submit="handleSubmit"
          />
        </template>
      </div>
      <p class="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          AbsoluteJS
        </a>
      </p>
    </div>
  </div>
  <input
    ref="fileInputRef"
    :accept="fileAccept"
    multiple
    style="display: none"
    type="file"
    @change="handleFileInputChange"
  />
</template>
