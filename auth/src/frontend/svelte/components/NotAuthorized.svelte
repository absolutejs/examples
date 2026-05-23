<script lang="ts">
  import Link from "@absolutejs/absolute/svelte/router/Link.svelte";
</script>

<section class="auth-content">
  <h1 class="page-heading">Not authorized</h1>
  <p class="muted">You need to sign in to view this page.</p>
  <Link to="/svelte" class="btn btn--primary">Go to sign in</Link>
</section>
