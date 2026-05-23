<script lang="ts">
  import Link from "@absolutejs/absolute/svelte/router/Link.svelte";
  import { goto } from "@absolutejs/absolute/svelte/router";
  import { NAV_ITEMS } from "../../shared/navData";
  import { authState, signOutUser } from "../stores/auth.svelte";

  let menuOpen = $state(false);
  const base = "/svelte";
  const linkTo = (path: string) => (path === "" ? base : `${base}/${path}`);

  const onSignOut = async () => {
    await signOutUser();
    menuOpen = false;
    goto(base);
  };
</script>

<header class="navbar">
  <Link to={base} class="navbar__brand">
    <img alt="" src="/assets/png/absolutejs-temp.png" />
    Absolute Auth
  </Link>

  <nav class="navbar__links">
    {#each NAV_ITEMS as item (item.path)}
      <Link to={linkTo(item.path)} class="navbar__link">{item.label}</Link>
    {/each}
  </nav>

  <div class="navbar__user">
    {#if authState.user}
      <span class="muted">
        {authState.user.email ?? authState.user.first_name ?? "Account"}
      </span>
      <button class="btn btn--ghost btn--sm" type="button" onclick={onSignOut}>
        Sign out
      </button>
    {:else}
      <Link to={base} class="btn btn--primary btn--sm">Sign in</Link>
    {/if}
    <button
      class="hamburger"
      type="button"
      aria-label="Toggle menu"
      onclick={() => (menuOpen = !menuOpen)}
    >
      <span class="hamburger__bar"></span>
      <span class="hamburger__bar"></span>
      <span class="hamburger__bar"></span>
    </button>
  </div>

  <div class={menuOpen ? "hamburger-menu is-open" : "hamburger-menu"}>
    <div class="hamburger-menu__header">
      <strong>Menu</strong>
      <button
        class="btn btn--ghost btn--sm"
        type="button"
        onclick={() => (menuOpen = false)}
      >
        Close
      </button>
    </div>
    {#each NAV_ITEMS as item (item.path)}
      <Link to={linkTo(item.path)} class="navbar__link">{item.label}</Link>
    {/each}
    {#if authState.user}
      <button class="btn btn--ghost" type="button" onclick={onSignOut}>
        Sign out
      </button>
    {/if}
  </div>
</header>
