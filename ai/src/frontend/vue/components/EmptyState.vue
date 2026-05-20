<script setup lang="ts">
import { ref, computed } from "vue";

type SuggestionCategory = {
  icon: string;
  label: string;
  prompts: string[];
};

defineProps<{
  suggestions: SuggestionCategory[];
}>();

const emit = defineEmits<{
  sendMessage: [text: string];
}>();

const activeCategory = ref<string | null>(null);

const toggleCategory = (label: string) => {
  activeCategory.value = activeCategory.value === label ? null : label;
};
</script>

<template>
  <div class="empty-state">
    <p class="welcome-text">What can I help you with?</p>
    <slot />
    <div class="suggestions">
      <div class="suggestion-pills">
        <button
          v-for="cat in suggestions"
          :key="cat.label"
          :class="['suggestion-pill', { active: activeCategory === cat.label }]"
          type="button"
          @click="toggleCategory(cat.label)"
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
            <path :d="cat.icon" />
          </svg>
          {{ cat.label }}
        </button>
      </div>
      <div
        v-if="suggestions.find((cat) => cat.label === activeCategory)"
        class="suggestion-prompts"
      >
        <button
          v-for="prompt in suggestions.find(
            (cat) => cat.label === activeCategory,
          )?.prompts ?? []"
          :key="prompt"
          class="suggestion"
          type="button"
          @click="emit('sendMessage', prompt)"
        >
          {{ prompt }}
        </button>
      </div>
    </div>
  </div>
</template>
