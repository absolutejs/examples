<script lang="ts">
  import { SW_STATES } from "../../constants";

  type LifecycleCardProps = {
    swReady: boolean;
  };

  let { swReady }: LifecycleCardProps = $props();

  const STATE_ORDER: Record<string, number> = {
    installing: 0,
    installed: 1,
    activating: 2,
    activated: 3,
    redundant: 4,
  };

  let currentState = $state<string | null>(null);
  let reachedStates = $state<Set<string>>(new Set());

  $effect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data.type === "sw-status") {
        const { status } = event.data;
        currentState = status;
        const next = new Set(reachedStates);
        const order = STATE_ORDER[status];
        if (order !== undefined) {
          for (const [key, val] of Object.entries(STATE_ORDER)) {
            if (val <= order) next.add(key);
          }
        }
        reachedStates = next;
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);

    if (swReady && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "get-status" });
    }

    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  });
</script>

<div class="sw-card">
  <div class="card-title">Lifecycle</div>
  <p class="card-desc">
    Track the service worker through its lifecycle stages.
  </p>
  <div class="lifecycle-steps">
    {#each SW_STATES as state}
      {@const isCurrent = currentState === state}
      {@const isReached = reachedStates.has(state)}
      <div class="lifecycle-step">
        <div
          class="lifecycle-dot"
          class:current={isCurrent}
          class:reached={isReached && !isCurrent}
        ></div>
        <span
          class="lifecycle-label"
          class:current={isCurrent}
          class:reached={isReached && !isCurrent}>{state}</span
        >
      </div>
    {/each}
  </div>
  <div class="sw-result">
    <div class="result-row">
      <span>Current</span><span>{currentState ?? "\u2014"}</span>
    </div>
  </div>
</div>
