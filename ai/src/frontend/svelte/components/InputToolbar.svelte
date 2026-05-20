<script lang="ts">
  import { COST_LABELS, COST_COLORS, type ModelDef } from "../../models";
  import ModelPicker from "./ModelPicker.svelte";

  type InputToolbarProps = {
    isStreaming: boolean;
    onCancel: () => void;
    onClickAttach: () => void;
    onSelectModel: (model: ModelDef) => void;
    selectedModel: ModelDef;
    supportsAttachments: boolean;
    supportsPdf: boolean;
    supportsVision: boolean;
  };

  let {
    isStreaming,
    onCancel,
    onClickAttach,
    onSelectModel,
    selectedModel,
    supportsAttachments,
    supportsPdf,
    supportsVision,
  }: InputToolbarProps = $props();

  let pickerOpen = $state(false);

  let attachTitle = $derived(
    `Attach ${[supportsVision && "image", supportsPdf && "PDF"].filter(Boolean).join(" or ")}`,
  );
</script>

<div class="input-toolbar">
  {#if supportsAttachments}
    <button
      class="attach-btn"
      onclick={onClickAttach}
      title={attachTitle}
      type="button"
    >
      <svg
        fill="none"
        height="16"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="16"
      >
        <path
          d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
        />
      </svg>
    </button>
  {/if}
  <div class="picker-anchor">
    <button
      class="model-select-btn"
      onclick={() => (pickerOpen = true)}
      type="button"
    >
      <img
        alt=""
        class="model-select-logo"
        height="16"
        src="/assets/svg/providers/{selectedModel.provider}.svg"
        width="16"
      />
      <span class="model-select-name">{selectedModel.name}</span>
      <span
        class="model-select-cost"
        style="color:{COST_COLORS[selectedModel.cost]}"
      >
        {COST_LABELS[selectedModel.cost]}
      </span>
      <svg
        fill="none"
        height="12"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="12"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    <ModelPicker
      currentModelId={selectedModel.id}
      onClose={() => (pickerOpen = false)}
      onSelect={onSelectModel}
      open={pickerOpen}
    />
  </div>
  {#if isStreaming}
    <button class="send-btn cancel" onclick={onCancel} type="button">
      <svg
        fill="none"
        height="16"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="16"
      >
        <rect height="14" rx="2" width="14" x="5" y="5" />
      </svg>
    </button>
  {:else}
    <button class="send-btn" type="submit">
      <svg
        fill="none"
        height="16"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="16"
      >
        <line x1="22" x2="11" y1="2" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  {/if}
</div>
