<script setup lang="ts">
defineProps<{
  file: {
    data: string;
    media_type:
      | "image/png"
      | "image/jpeg"
      | "image/gif"
      | "image/webp"
      | "application/pdf";
    name: string;
    preview: string;
  };
}>();

const emit = defineEmits<{
  remove: [];
}>();
</script>

<template>
  <div class="file-preview">
    <template v-if="file.media_type === 'application/pdf'">
      <div class="file-preview-pdf" :title="file.name">
        <svg
          fill="none"
          height="24"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          width="24"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span class="file-preview-pdf-label">PDF</span>
      </div>
    </template>
    <template v-else>
      <img :alt="file.name" :src="file.preview" />
    </template>
    <button class="file-preview-remove" type="button" @click="emit('remove')">
      <svg
        fill="none"
        height="10"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="10"
      >
        <line x1="18" x2="6" y1="6" y2="18" />
        <line x1="6" x2="18" y1="6" y2="18" />
      </svg>
    </button>
  </div>
</template>
