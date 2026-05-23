<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ data: unknown }>();

const TOKEN =
  /("(?:\\.|[^"\\])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

const classForToken = (token: string) => {
  if (token.startsWith('"')) {
    return token.trimEnd().endsWith(":") ? "json__key" : "json__string";
  }
  if (token === "true" || token === "false") {
    return "json__bool";
  }
  if (token === "null") {
    return "json__null";
  }

  return "json__number";
};

const parts = computed(() => {
  const text = JSON.stringify(props.data, null, 2) ?? "null";

  return text.split(TOKEN).map((part, index) => ({
    className: index % 2 === 0 ? "json__punct" : classForToken(part),
    key: index,
    text: part,
  }));
});
</script>

<template>
  <pre
    class="json"
  ><span v-for="part in parts" :key="part.key" :class="part.className">{{ part.text }}</span></pre>
</template>
