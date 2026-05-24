import { defineIslandRegistry } from "@absolutejs/absolute/islands";
import { createTypedIsland as createTypedAngularIsland } from "@absolutejs/absolute/angular";
import { createTypedIsland as createTypedReactIsland } from "@absolutejs/absolute/react";
import { createTypedIsland as createTypedSvelteIsland } from "@absolutejs/absolute/svelte";
import { createTypedIsland as createTypedVueIsland } from "@absolutejs/absolute/vue";
import { AngularCounter } from "../angular/components/angular-counter/angular-counter";
import { ReactCounter } from "../react/components/ReactCounter";
import SvelteCounter from "../svelte/components/SvelteCounter.svelte";
import { VueCounter } from "../vue/components/VueCounter";

export const islandRegistry = defineIslandRegistry({
  angular: {
    AngularCounter,
  },
  react: {
    ReactCounter,
  },
  svelte: {
    SvelteCounter,
  },
  vue: {
    VueCounter,
  },
});

export const TypedAngularIsland = createTypedAngularIsland(islandRegistry);
export const TypedReactIsland = createTypedReactIsland(islandRegistry);
export const TypedSvelteIsland = createTypedSvelteIsland(islandRegistry);
export const TypedVueIsland = createTypedVueIsland(islandRegistry);
