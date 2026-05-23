<script lang="ts">
  import { authState } from "../stores/auth.svelte";
  import HighlightedJson from "./HighlightedJson.svelte";
  import NotAuthorized from "./NotAuthorized.svelte";
</script>

{#if authState.loading}
  <section class="auth-content">
    <p class="muted">Checking your session…</p>
  </section>
{:else if !authState.user}
  <NotAuthorized />
{:else}
  <section class="auth-section stack">
    <div>
      <h1 class="page-heading">Protected page</h1>
      <p class="muted">
        Your authenticated session resolves to this user record.
      </p>
    </div>
    <HighlightedJson data={authState.user} />
  </section>
{/if}
