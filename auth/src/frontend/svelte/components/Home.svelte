<script lang="ts">
  import Link from "@absolutejs/absolute/svelte/router/Link.svelte";
  import { authState } from "../stores/auth.svelte";
  import ProviderLogin from "./ProviderLogin.svelte";
</script>

<section class="auth-content">
  <h1 class="page-heading">Absolute Auth — Svelte</h1>
  {#if authState.user}
    <p class="muted">
      You are signed in as {authState.user.email ?? authState.user.sub}.
    </p>
    <Link to="/svelte/protected" class="btn btn--primary">
      View the protected page
    </Link>
  {:else}
    <p class="muted">
      Sign in or sign up with any OAuth2 provider to test the flow.
    </p>
    <div class="card login-card text-left">
      <ProviderLogin action="login" />
    </div>
  {/if}
</section>
