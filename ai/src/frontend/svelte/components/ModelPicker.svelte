<script lang="ts">
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
  import FilterPopover from "./FilterPopover.svelte";
  import ModelListItem from "./ModelListItem.svelte";

  type ModelPickerProps = {
    currentModelId: string;
    onClose: () => void;
    onSelect: (model: ModelDef) => void;
    open: boolean;
  };

  let { currentModelId, onClose, onSelect, open }: ModelPickerProps = $props();

  const PROVIDER_LOGO_PATH = "/assets/svg/providers";

  let search = $state("");
  let providerFilter = $state<ProviderKey | undefined>(undefined);
  let showLegacy = $state(false);
  let capFilters = $state<ModelCapability[]>([]);
  let filterOpen = $state(false);
  let filterClosing = $state(false);
  let visible = $state(false);
  let closing = $state(false);
  let searchInput: HTMLInputElement | undefined = $state(undefined);

  const closeFilter = () => {
    filterClosing = true;
    setTimeout(() => {
      filterClosing = false;
      filterOpen = false;
    }, FILTER_CLOSE_MS);
  };

  const toggleFilter = () => {
    if (filterOpen) {
      closeFilter();
    } else {
      filterOpen = true;
      filterClosing = false;
    }
  };

  const toggleCap = (cap: ModelCapability) => {
    if (capFilters.includes(cap)) {
      capFilters = capFilters.filter((cur) => cur !== cap);
    } else {
      capFilters = [...capFilters, cap];
    }
  };

  const handleClose = () => {
    closing = true;
    filterOpen = false;
    filterClosing = false;
    setTimeout(() => {
      closing = false;
      visible = false;
      onClose();
    }, MODAL_CLOSE_MS);
  };

  $effect(() => {
    if (open && !visible) {
      visible = true;
      closing = false;
      setTimeout(() => searchInput?.focus(), SEARCH_FOCUS_DELAY_MS);
    }
    if (!open && visible && !closing) {
      search = "";
    }
  });

  $effect(() => {
    const handleKey = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        handleClose();
      }
    };
    if (visible) {
      window.addEventListener("keydown", handleKey);
    }
    return () => window.removeEventListener("keydown", handleKey);
  });

  let models = $derived(
    filterModels(
      search,
      providerFilter,
      showLegacy,
      capFilters.length > 0 ? capFilters : undefined,
    ),
  );

  let grouped = $derived.by(() => {
    const map = new Map<string, ModelDef[]>();
    for (const model of models) {
      const existing = map.get(model.provider) ?? [];
      existing.push(model);
      map.set(model.provider, existing);
    }
    return map;
  });
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="picker-overlay" onclick={handleClose}></div>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="picker-modal"
    class:closing
    onclick={() => {
      if (filterOpen) closeFilter();
    }}
  >
    <div class="picker-layout">
      <!-- Providers sidebar -->
      <div class="picker-providers">
        <button
          class="picker-prov-btn"
          class:active={!providerFilter}
          onclick={() => (providerFilter = undefined)}
          title="All providers"
          type="button"
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
        {#each PROVIDERS as prov (prov.id)}
          <button
            class="picker-prov-btn"
            class:active={providerFilter === prov.id}
            onclick={() =>
              (providerFilter =
                providerFilter === prov.id ? undefined : prov.id)}
            title={prov.name}
            type="button"
          >
            <img
              alt={prov.name}
              class="picker-prov-logo"
              height="18"
              src="{PROVIDER_LOGO_PATH}/{prov.id}.svg"
              width="18"
            />
          </button>
        {/each}
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
            bind:this={searchInput}
            class="picker-search-input"
            oninput={(evt: Event) =>
              (search = (evt.target as HTMLInputElement).value)}
            placeholder="Search models..."
            value={search}
          />
          <div class="picker-filter-wrap">
            <button
              class="picker-filter-btn"
              class:has-filters={capFilters.length > 0}
              onclick={toggleFilter}
              title="Filter by capabilities"
              type="button"
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
              {#if capFilters.length > 0}
                <span class="filter-count">{capFilters.length}</span>
              {/if}
            </button>
            {#if filterOpen}
              <FilterPopover
                {capFilters}
                closing={filterClosing}
                onToggleCap={toggleCap}
                onToggleLegacy={() => (showLegacy = !showLegacy)}
                {showLegacy}
              />
            {/if}
          </div>
        </div>

        <!-- Model list -->
        <div class="picker-list">
          {#if grouped.size === 0}
            <div class="picker-empty">No models match your search</div>
          {/if}
          {#each Array.from(grouped.entries()) as [providerId, provModels] (providerId)}
            <div>
              {#if !providerFilter}
                <div class="picker-section-header">
                  {PROVIDERS.find((p) => p.id === providerId)?.name ??
                    providerId}
                </div>
              {/if}
              {#each provModels as model (model.id)}
                <ModelListItem
                  {model}
                  onclick={() => {
                    onSelect(model);
                    handleClose();
                  }}
                  providerLogoPath={PROVIDER_LOGO_PATH}
                  selected={model.id === currentModelId}
                />
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
