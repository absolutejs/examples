<script setup lang="ts">
type ServerHtmlCardProps = {
  html: string;
};

defineProps<ServerHtmlCardProps>();
</script>

<template>
  <div v-html="html"></div>
</template>
