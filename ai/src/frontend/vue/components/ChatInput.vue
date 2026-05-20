<script setup lang="ts">
import type { ModelDef } from "../../models";
import FilePreviewItem from "./FilePreviewItem.vue";
import InputToolbar from "./InputToolbar.vue";

type MediaType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

type PendingFile = {
  data: string;
  media_type: MediaType;
  name: string;
  preview: string;
};

const props = defineProps<{
  fileInputRef: HTMLInputElement | null;
  hasMessages: boolean;
  isStreaming: boolean;
  pendingFiles: PendingFile[];
  selectedModel: ModelDef;
  supportsAttachments: boolean;
  supportsPdf: boolean;
  supportsVision: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  processFiles: [files: FileList | File[]];
  removeFile: [idx: number];
  selectModel: [model: ModelDef];
  submit: [evt: Event];
}>();

const onDragOver = (evt: DragEvent) => {
  evt.preventDefault();
  (evt.currentTarget as HTMLElement).classList.add("drag-over");
};

const onDragLeave = (evt: DragEvent) => {
  (evt.currentTarget as HTMLElement).classList.remove("drag-over");
};

const onDrop = (evt: DragEvent) => {
  evt.preventDefault();
  (evt.currentTarget as HTMLElement).classList.remove("drag-over");
  if (evt.dataTransfer?.files && evt.dataTransfer.files.length > 0) {
    emit("processFiles", evt.dataTransfer.files);
  }
};

const onKeyDown = (evt: KeyboardEvent) => {
  if (evt.key !== "Enter" || evt.shiftKey) return;
  evt.preventDefault();
  (evt.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
};

const onPaste = (evt: ClipboardEvent) => {
  if (!evt.clipboardData) return;
  const { items } = evt.clipboardData;
  const files: File[] = [];
  for (const item of Array.from(items)) {
    const isAttachable =
      item.type.startsWith("image/") || item.type === "application/pdf";
    if (!isAttachable) continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  if (files.length > 0) emit("processFiles", files);
};
</script>

<template>
  <form
    :class="['chat-input-card', { centered: !hasMessages }]"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
    @submit.prevent="emit('submit', $event)"
  >
    <div v-if="pendingFiles.length > 0" class="file-previews">
      <FilePreviewItem
        v-for="(file, idx) in pendingFiles"
        :key="`${file.name}-${idx}`"
        :file="file"
        @remove="emit('removeFile', idx)"
      />
    </div>
    <textarea
      autocomplete="off"
      :disabled="isStreaming"
      name="input"
      :placeholder="hasMessages ? 'Reply...' : 'Ask anything...'"
      :rows="hasMessages ? 1 : 2"
      @keydown="onKeyDown"
      @paste="onPaste"
    />
    <InputToolbar
      :file-input-ref="fileInputRef"
      :is-streaming="isStreaming"
      :selected-model="selectedModel"
      :supports-attachments="supportsAttachments"
      :supports-pdf="supportsPdf"
      :supports-vision="supportsVision"
      @cancel="emit('cancel')"
      @select-model="(model: ModelDef) => emit('selectModel', model)"
    />
  </form>
</template>
