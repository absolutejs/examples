<script setup lang="ts">
import { ref, onMounted, computed } from "vue";

const emit = defineEmits<{
  registered: [reg: ServiceWorkerRegistration | null];
}>();

type SwState = "unsupported" | "unregistered" | "registering" | "active";
const state = ref<SwState>("unregistered");
const scope = ref<string | null>(null);
const scriptUrl = ref<string | null>(null);

const badgeClass = computed(() =>
  state.value === "active"
    ? "active"
    : state.value === "registering"
      ? "pending"
      : "inactive",
);
const badgeLabel = computed(() =>
  state.value === "unsupported"
    ? "Not Supported"
    : state.value === "active"
      ? "Active"
      : state.value === "registering"
        ? "Registering"
        : "Unregistered",
);

onMounted(() => {
  if (!("serviceWorker" in navigator)) {
    state.value = "unsupported";
    return;
  }
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg?.active) {
      state.value = "active";
      scope.value = reg.scope;
      scriptUrl.value = reg.active.scriptURL;
      emit("registered", reg);
    }
  });
});

function register() {
  if (!("serviceWorker" in navigator)) return;
  state.value = "registering";
  navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then((reg) => {
      const sw = reg.active || reg.installing || reg.waiting;
      if (sw) {
        sw.addEventListener("statechange", () => {
          if (sw.state === "activated") {
            state.value = "active";
            scope.value = reg.scope;
            scriptUrl.value = sw.scriptURL;
            emit("registered", reg);
          }
        });
        if (sw.state === "activated") {
          state.value = "active";
          scope.value = reg.scope;
          scriptUrl.value = sw.scriptURL;
          emit("registered", reg);
        }
      }
    })
    .catch(() => {
      state.value = "unregistered";
    });
}

function unregister() {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg) {
      reg.unregister().then(() => {
        state.value = "unregistered";
        scope.value = null;
        scriptUrl.value = null;
        emit("registered", null);
      });
    }
  });
}
</script>

<template>
  <div class="sw-card">
    <div class="card-title">Registration</div>
    <p class="card-desc">Register and unregister the service worker.</p>
    <div :class="['status-badge', badgeClass]">
      <span class="dot"></span>
      {{ badgeLabel }}
    </div>
    <div class="btn-row">
      <button
        :disabled="state === 'active' || state === 'unsupported'"
        @click="register"
      >
        Register
      </button>
      <button class="danger" :disabled="state !== 'active'" @click="unregister">
        Unregister
      </button>
    </div>
    <div class="sw-result">
      <div class="result-row">
        <span>Scope</span><span>{{ scope ?? "\u2014" }}</span>
      </div>
      <div class="result-row">
        <span>Script</span
        ><span>{{ scriptUrl ? scriptUrl.split("/").pop() : "\u2014" }}</span>
      </div>
    </div>
  </div>
</template>
