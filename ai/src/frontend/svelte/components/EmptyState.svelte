<script lang="ts">
  import type { Snippet } from "svelte";

  type SuggestionCategory = {
    icon: string;
    label: string;
    prompts: string[];
  };

  type EmptyStateProps = {
    inputBox: Snippet;
    onSendMessage: (text: string) => void;
    suggestions: SuggestionCategory[];
  };

  let { inputBox, onSendMessage, suggestions }: EmptyStateProps = $props();

  let activeCategory = $state<string | null>(null);

  let activeSuggestions = $derived(
    suggestions.find((cat) => cat.label === activeCategory),
  );
</script>

<div class="empty-state">
  <p class="welcome-text">What can I help you with?</p>
  {@render inputBox()}
  <div class="suggestions">
    <div class="suggestion-pills">
      {#each suggestions as cat (cat.label)}
        <button
          class="suggestion-pill"
          class:active={activeCategory === cat.label}
          onclick={() =>
            (activeCategory = activeCategory === cat.label ? null : cat.label)}
          type="button"
        >
          <svg
            fill="none"
            height="14"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            viewBox="0 0 24 24"
            width="14"
          >
            <path d={cat.icon} />
          </svg>
          {cat.label}
        </button>
      {/each}
    </div>
    {#if activeSuggestions}
      <div class="suggestion-prompts">
        {#each activeSuggestions.prompts as prompt (prompt)}
          <button
            class="suggestion"
            onclick={() => onSendMessage(prompt)}
            type="button"
          >
            {prompt}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
