<script setup lang="ts">
import { COST_LABELS, COST_COLORS, type ModelDef } from "../../models";
import CapabilityIcon from "./CapabilityIcon.vue";

defineProps<{
  model: ModelDef;
  providerLogoPath: string;
  selected: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    :class="['picker-model', { selected }]"
    type="button"
    @click="emit('click')"
  >
    <div class="picker-model-row">
      <img
        alt=""
        class="picker-model-logo"
        height="16"
        :src="`${providerLogoPath}/${model.provider}.svg`"
        width="16"
      />
      <span class="picker-model-name">{{ model.name }}</span>
      <span class="picker-cost" :style="{ color: COST_COLORS[model.cost] }">
        {{ COST_LABELS[model.cost] }}
      </span>
      <span v-if="model.legacy" class="picker-legacy">legacy</span>
      <div class="picker-cap-icons">
        <CapabilityIcon
          v-for="cap in model.capabilities"
          :key="cap"
          :capability="cap"
          :size="12"
        />
      </div>
    </div>
    <div class="picker-model-desc">{{ model.description }}</div>
  </button>
</template>
