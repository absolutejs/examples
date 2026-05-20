<script setup lang="ts">
import { ref } from "vue";
import { COST_LABELS, COST_COLORS, type ModelDef } from "../../models";
import ModelPicker from "./ModelPicker.vue";

const props = defineProps<{
  fileInputRef: HTMLInputElement | null;
  isStreaming: boolean;
  selectedModel: ModelDef;
  supportsAttachments: boolean;
  supportsPdf: boolean;
  supportsVision: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  selectModel: [model: ModelDef];
}>();

const pickerOpen = ref(false);

const attachTitle = () => {
  const parts: string[] = [];
  if (props.supportsVision) parts.push("image");
  if (props.supportsPdf) parts.push("PDF");
  return `Attach ${parts.join(" or ")}`;
};
</script>

<template>
  <div class="input-toolbar">
    <button
      v-if="supportsAttachments"
      class="attach-btn"
      :title="attachTitle()"
      type="button"
      @click="fileInputRef?.click()"
    >
      <svg
        fill="none"
        height="16"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="16"
      >
        <path
          d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
        />
      </svg>
    </button>
    <div class="picker-anchor">
      <button class="model-select-btn" type="button" @click="pickerOpen = true">
        <img
          alt=""
          class="model-select-logo"
          height="16"
          :src="`/assets/svg/providers/${selectedModel.provider}.svg`"
          width="16"
        />
        <span class="model-select-name">{{ selectedModel.name }}</span>
        <span
          class="model-select-cost"
          :style="{ color: COST_COLORS[selectedModel.cost] }"
        >
          {{ COST_LABELS[selectedModel.cost] }}
        </span>
        <svg
          fill="none"
          height="12"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="12"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <ModelPicker
        :current-model-id="selectedModel.id"
        :open="pickerOpen"
        @close="pickerOpen = false"
        @select="(model: ModelDef) => emit('selectModel', model)"
      />
    </div>
    <button
      v-if="isStreaming"
      class="send-btn cancel"
      type="button"
      @click="emit('cancel')"
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
        <rect height="14" rx="2" width="14" x="5" y="5" />
      </svg>
    </button>
    <button v-else class="send-btn" type="submit">
      <svg
        fill="none"
        height="16"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="16"
      >
        <line x1="22" x2="11" y1="2" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  </div>
</template>
