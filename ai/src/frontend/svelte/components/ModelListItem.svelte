<script lang="ts">
  import { COST_LABELS, COST_COLORS, type ModelDef } from "../../models";
  import CapabilityIcon from "./CapabilityIcon.svelte";

  type ModelListItemProps = {
    model: ModelDef;
    onclick: () => void;
    providerLogoPath: string;
    selected: boolean;
  };

  let { model, onclick, providerLogoPath, selected }: ModelListItemProps =
    $props();
</script>

<button class="picker-model" class:selected {onclick} type="button">
  <div class="picker-model-row">
    <img
      alt=""
      class="picker-model-logo"
      height="16"
      src="{providerLogoPath}/{model.provider}.svg"
      width="16"
    />
    <span class="picker-model-name">{model.name}</span>
    <span class="picker-cost" style="color:{COST_COLORS[model.cost]}"
      >{COST_LABELS[model.cost]}</span
    >
    {#if model.legacy}
      <span class="picker-legacy">legacy</span>
    {/if}
    <div class="picker-cap-icons">
      {#each model.capabilities as cap (cap)}
        <CapabilityIcon capability={cap} size={12} />
      {/each}
    </div>
  </div>
  <div class="picker-model-desc">{model.description}</div>
</button>
