<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { SW_STATES } from "../../constants";

const props = defineProps<{ swReady: boolean }>();

const STATE_ORDER: Record<string, number> = {
  installing: 0,
  installed: 1,
  activating: 2,
  activated: 3,
  redundant: 4,
};

const currentState = ref<string | null>(null);
const reachedStates = ref<Set<string>>(new Set());

const handler = (event: MessageEvent) => {
  if (event.data.type === "sw-status") {
    const { status } = event.data;
    currentState.value = status;
    const next = new Set(reachedStates.value);
    const order = STATE_ORDER[status];
    if (order !== undefined) {
      for (const [key, val] of Object.entries(STATE_ORDER)) {
        if (val <= order) next.add(key);
      }
    }
    reachedStates.value = next;
  }
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", handler);
}

onUnmounted(() => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.removeEventListener("message", handler);
  }
});

watch(
  () => props.swReady,
  (ready) => {
    if (ready && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "get-status" });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="sw-card">
    <div class="card-title">Lifecycle</div>
    <p class="card-desc">
      Track the service worker through its lifecycle stages.
    </p>
    <div class="lifecycle-steps">
      <div v-for="state in SW_STATES" :key="state" class="lifecycle-step">
        <div
          class="lifecycle-dot"
          :class="{
            current: currentState === state,
            reached: reachedStates.has(state) && currentState !== state,
          }"
        ></div>
        <span
          class="lifecycle-label"
          :class="{
            current: currentState === state,
            reached: reachedStates.has(state) && currentState !== state,
          }"
          >{{ state }}</span
        >
      </div>
    </div>
    <div class="sw-result">
      <div class="result-row">
        <span>Current</span><span>{{ currentState ?? "\u2014" }}</span>
      </div>
    </div>
  </div>
</template>
