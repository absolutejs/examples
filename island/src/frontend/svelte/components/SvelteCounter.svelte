<script lang="ts">
  import { useIslandStore } from "@absolutejs/absolute/svelte";
  import { counterIslandStore } from "../../islands/counterStore";

  let {
    initialCount,
    label,
  }: {
    initialCount: number;
    label: string;
  } = $props();

  let count = $state(initialCount);
  const sharedCount = useIslandStore(
    counterIslandStore,
    (state) => state.sharedCount,
  );
  const incrementShared = useIslandStore(
    counterIslandStore,
    (state) => state.incrementShared,
  );
</script>

<div class="island-card island-card-svelte">
  <div class="island-header">
    <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
    <span>{label}</span>
  </div>
  <strong>Local: {count}</strong>
  <strong>Shared: {$sharedCount}</strong>
  <button onclick={() => (count += 1)} type="button"> Increment Svelte </button>
  <button onclick={() => $incrementShared()} type="button">
    Increment Shared
  </button>
</div>
