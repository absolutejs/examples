<script setup lang="ts">
import { CAPABILITY_LABELS, MODELS, type ModelCapability } from "../../models";
import CapabilityIcon from "./CapabilityIcon.vue";

defineProps<{
  capFilters: ModelCapability[];
  closing: boolean;
  showLegacy: boolean;
}>();

const emit = defineEmits<{
  toggleCap: [cap: ModelCapability];
  toggleLegacy: [];
}>();

const CAPABILITY_DESCRIPTIONS: Record<ModelCapability, string> = {
  fast: "Optimized for low latency responses, ideal for real-time applications",
  "image-gen": "Can generate and edit images from text descriptions",
  pdf: "Can read and understand PDF documents uploaded to the conversation",
  reasoning: "Advanced chain-of-thought reasoning for complex logic and math",
  "tool-calling": "Can call external tools and functions to take actions",
  vision: "Can analyze and understand images in the conversation",
};

const ALL_CAPABILITIES: ModelCapability[] = [
  "fast",
  "vision",
  "reasoning",
  "tool-calling",
  "image-gen",
  "pdf",
];

const legacyCount = MODELS.filter((mod) => mod.legacy).length;
</script>

<template>
  <div :class="['filter-popover', { closing }]" @click.stop>
    <div v-for="cap in ALL_CAPABILITIES" :key="cap" class="filter-row">
      <button
        :class="['filter-option', { active: capFilters.includes(cap) }]"
        type="button"
        @click="emit('toggleCap', cap)"
      >
        <CapabilityIcon :capability="cap" />
        <span class="filter-option-label">{{
          CAPABILITY_LABELS[cap].label
        }}</span>
      </button>
      <span class="filter-info" tabindex="0">
        <svg
          fill="none"
          height="12"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="12"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="16" y2="12" />
          <line x1="12" x2="12.01" y1="8" y2="8" />
        </svg>
        <span class="filter-info-tip">{{ CAPABILITY_DESCRIPTIONS[cap] }}</span>
      </span>
    </div>
    <div class="filter-divider" />
    <button
      :class="['filter-option', { active: showLegacy }]"
      type="button"
      @click="emit('toggleLegacy')"
    >
      <span
        class="cap-badge"
        :style="{
          alignItems: 'center',
          background: showLegacy
            ? 'rgba(136, 136, 136, 0.18)'
            : 'rgba(136, 136, 136, 0.10)',
          borderRadius: '4px',
          display: 'inline-flex',
          height: '20px',
          justifyContent: 'center',
          width: '20px',
        }"
      >
        <svg
          fill="none"
          height="14"
          :stroke="showLegacy ? '#aaa' : '#666'"
          stroke-linecap="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      <span class="filter-option-label">Legacy models ({{ legacyCount }})</span>
    </button>
  </div>
</template>
