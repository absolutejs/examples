import { createReactiveHub } from "@absolutejs/sync";

// One process-wide hub. Mutations publish topics here; the @absolutejs/sync SSE
// plugin streams them to subscribed browsers so widgets refetch on change instead
// of polling on a timer (which is what exhausted the first Neon project).
export const reactiveHub = createReactiveHub();
