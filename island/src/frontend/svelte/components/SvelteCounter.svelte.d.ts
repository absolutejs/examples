// Type-only sidecar for SvelteCounter.svelte.
//
// Svelte's bundled `*.svelte` ambient declaration types every component's
// default export as `LegacyComponentType`. That shape works for the page
// handlers (which read props via `Component<infer P>`), but it does NOT match
// the island registry's `ExtractSvelteProps`, which only recognises a component
// whose constructor accepts `{ props?: P }`. Without a matching shape the typed
// island map infers `props: Record<string, never>` for this Svelte island, so
// `<TypedReactIsland component="SvelteCounter" … />` fails to typecheck.
//
// TypeScript prefers a `*.svelte.d.ts` sidecar over the generic `*.svelte`
// ambient, so this file gives the registry the constructor shape it needs while
// the runtime keeps importing the real `.svelte` component untouched. The props
// mirror the component's `$props()` declaration, keeping the registry strongly
// typed.
declare const SvelteCounter: abstract new (options: {
  props?: { initialCount: number; label: string };
}) => object;

export default SvelteCounter;
