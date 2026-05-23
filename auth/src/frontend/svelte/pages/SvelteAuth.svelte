<script lang="ts">
  import Route from "@absolutejs/absolute/svelte/router/Route.svelte";
  import Router from "@absolutejs/absolute/svelte/router/Router.svelte";
  import { onMount } from "svelte";
  import Connectors from "../components/Connectors.svelte";
  import Home from "../components/Home.svelte";
  import Navbar from "../components/Navbar.svelte";
  import Protected from "../components/Protected.svelte";
  import Settings from "../components/Settings.svelte";
  import { startAuth } from "../stores/auth.svelte";
  import { removeToast, toastState } from "../stores/toast.svelte";

  let { cssPath, url }: { cssPath?: string; url?: string } = $props();

  onMount(startAuth);
</script>

<svelte:head>
  <title>AbsoluteJS Auth — Svelte</title>
  <link rel="icon" href="/assets/favicon.ico" />
  {#if cssPath}
    <link rel="stylesheet" href={cssPath} type="text/css" />
  {/if}
</svelte:head>

<Navbar />
<main class="auth-main">
  <Router {url}>
    <Route path="/svelte">
      {#snippet content()}<Home />{/snippet}
    </Route>
    <Route path="/svelte/protected">
      {#snippet content()}<Protected />{/snippet}
    </Route>
    <Route path="/svelte/settings">
      {#snippet content()}<Settings />{/snippet}
    </Route>
    <Route path="/svelte/connectors">
      {#snippet content()}<Connectors />{/snippet}
    </Route>
  </Router>
</main>

<div class="toast-stack">
  {#each toastState.items as toast (toast.id)}
    <div class={toast.tone === "info" ? "toast" : `toast toast--${toast.tone}`}>
      <span>{toast.message}</span>
      <button
        class="toast__close"
        type="button"
        aria-label="Dismiss notification"
        onclick={() => removeToast(toast.id)}
      >
        ×
      </button>
    </div>
  {/each}
</div>
