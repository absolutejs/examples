<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from "vue";
import {
  FILTER_CLOSE_MS,
  MODAL_CLOSE_MS,
  SEARCH_FOCUS_DELAY_MS,
} from "../../constants";
import {
  PROVIDERS,
  filterModels,
  type ProviderKey,
  type ModelDef,
  type ModelCapability,
} from "../../models";
import FilterPopover from "./FilterPopover.vue";
import ModelListItem from "./ModelListItem.vue";

const props = defineProps<{
  currentModelId: string;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  select: [model: ModelDef];
}>();

const PROVIDER_LOGO_PATH = "/assets/svg/providers";

const search = ref("");
const providerFilter = ref<ProviderKey | undefined>(undefined);
const showLegacy = ref(false);
const capFilters = ref<ModelCapability[]>([]);
const filterOpen = ref(false);
const filterClosing = ref(false);
const visible = ref(false);
const closing = ref(false);
const searchRef = ref<HTMLInputElement | null>(null);

const closeFilter = () => {
  filterClosing.value = true;
  setTimeout(() => {
    filterClosing.value = false;
    filterOpen.value = false;
  }, FILTER_CLOSE_MS);
};

const toggleFilter = () => {
  if (filterOpen.value) {
    closeFilter();
  } else {
    filterOpen.value = true;
    filterClosing.value = false;
  }
};

const toggleCap = (cap: ModelCapability) => {
  const idx = capFilters.value.indexOf(cap);
  if (idx >= 0) {
    capFilters.value = capFilters.value.filter((c) => c !== cap);
  } else {
    capFilters.value = [...capFilters.value, cap];
  }
};

const handleClose = () => {
  closing.value = true;
  filterOpen.value = false;
  filterClosing.value = false;
  setTimeout(() => {
    closing.value = false;
    visible.value = false;
    emit("close");
  }, MODAL_CLOSE_MS);
};

watch(
  () => props.open,
  (newOpen) => {
    if (newOpen && !visible.value) {
      visible.value = true;
      closing.value = false;
      setTimeout(() => searchRef.value?.focus(), SEARCH_FOCUS_DELAY_MS);
    }
    if (!newOpen && visible.value && !closing.value) {
      search.value = "";
    }
  },
);

const handleKeydown = (evt: KeyboardEvent) => {
  if (evt.key === "Escape") {
    handleClose();
  }
};

watch(visible, (isVisible) => {
  if (isVisible) {
    window.addEventListener("keydown", handleKeydown);
  } else {
    window.removeEventListener("keydown", handleKeydown);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});

const models = computed(() =>
  filterModels(
    search.value,
    providerFilter.value,
    showLegacy.value,
    capFilters.value.length > 0 ? capFilters.value : undefined,
  ),
);

const grouped = computed(() => {
  const map = new Map<string, ModelDef[]>();
  for (const model of models.value) {
    const existing = map.get(model.provider) ?? [];
    existing.push(model);
    map.set(model.provider, existing);
  }
  return map;
});

const handlePickerClick = () => {
  if (filterOpen.value) closeFilter();
};

const handleModelSelect = (model: ModelDef) => {
  emit("select", model);
  handleClose();
};
</script>

<template>
  <template v-if="visible">
    <div class="picker-overlay" @click="handleClose" />
    <div :class="['picker-modal', { closing }]" @click="handlePickerClick">
      <div class="picker-layout">
        <!-- Provider sidebar -->
        <div class="picker-providers">
          <button
            :class="['picker-prov-btn', { active: !providerFilter }]"
            title="All providers"
            type="button"
            @click="providerFilter = undefined"
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
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              />
            </svg>
          </button>
          <button
            v-for="prov in PROVIDERS"
            :key="prov.id"
            :class="['picker-prov-btn', { active: providerFilter === prov.id }]"
            :title="prov.name"
            type="button"
            @click="
              providerFilter = providerFilter === prov.id ? undefined : prov.id
            "
          >
            <img
              :alt="prov.name"
              class="picker-prov-logo"
              height="18"
              :src="`${PROVIDER_LOGO_PATH}/${prov.id}.svg`"
              width="18"
            />
          </button>
        </div>

        <!-- Main content -->
        <div class="picker-main">
          <!-- Search bar -->
          <div class="picker-search">
            <svg
              fill="none"
              height="15"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
              width="15"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
            <input
              ref="searchRef"
              class="picker-search-input"
              placeholder="Search models..."
              v-model="search"
            />
            <div class="picker-filter-wrap">
              <button
                :class="[
                  'picker-filter-btn',
                  { 'has-filters': capFilters.length > 0 },
                ]"
                title="Filter by capabilities"
                type="button"
                @click="toggleFilter"
              >
                <svg
                  fill="none"
                  height="15"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  width="15"
                >
                  <line x1="4" x2="4" y1="21" y2="14" />
                  <line x1="4" x2="4" y1="10" y2="3" />
                  <line x1="12" x2="12" y1="21" y2="12" />
                  <line x1="12" x2="12" y1="8" y2="3" />
                  <line x1="20" x2="20" y1="21" y2="16" />
                  <line x1="20" x2="20" y1="12" y2="3" />
                  <line x1="1" x2="7" y1="14" y2="14" />
                  <line x1="9" x2="15" y1="8" y2="8" />
                  <line x1="17" x2="23" y1="16" y2="16" />
                </svg>
                <span v-if="capFilters.length > 0" class="filter-count">{{
                  capFilters.length
                }}</span>
              </button>
              <FilterPopover
                v-if="filterOpen"
                :cap-filters="capFilters"
                :closing="filterClosing"
                :show-legacy="showLegacy"
                @toggle-cap="toggleCap"
                @toggle-legacy="showLegacy = !showLegacy"
              />
            </div>
          </div>

          <!-- Model list -->
          <div class="picker-list">
            <div v-if="grouped.size === 0" class="picker-empty">
              No models match your search
            </div>
            <div v-for="[providerId, provModels] in grouped" :key="providerId">
              <div v-if="!providerFilter" class="picker-section-header">
                {{
                  PROVIDERS.find((p) => p.id === providerId)?.name ?? providerId
                }}
              </div>
              <ModelListItem
                v-for="model in provModels"
                :key="model.id"
                :model="model"
                :provider-logo-path="PROVIDER_LOGO_PATH"
                :selected="model.id === currentModelId"
                @click="handleModelSelect(model)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
