<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  type AuthUser = {
    sub: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    primary_auth_identity_id?: string | null;
  };

  const loginProviders = [
    {
      href: "/oauth2/google/authorization?client=login",
      iconPath: "/assets/svg/providers/google.svg",
      key: "google",
      label: "Google",
    },
    {
      href: "/oauth2/facebook/authorization?client=login",
      iconPath: "/assets/svg/providers/meta.svg",
      key: "facebook",
      label: "Facebook",
    },
  ] as const;

  function getAccountLabel(user: AuthUser | null): string {
    if (!user) {
      return "Login";
    }
    const fullName = [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || user.email || "Account";
  }

  let isBusy = true;
  let isOpen = false;
  let user: AuthUser | null = null;
  let containerEl: HTMLDivElement;

  $: accountLabel = getAccountLabel(user);

  onMount(() => {
    let cancelled = false;

    async function loadAuthStatus() {
      try {
        const response = await fetch("/oauth2/status");
        if (!response.ok) {
          if (!cancelled) user = null;
          return;
        }
        const payload = (await response.json()) as { user?: AuthUser | null };
        if (!cancelled) user = payload.user ?? null;
      } catch (error) {
        console.error("Failed to load auth status", error);
        if (!cancelled) user = null;
      } finally {
        if (!cancelled) isBusy = false;
      }
    }

    void loadAuthStatus();

    return () => {
      cancelled = true;
    };
  });

  function handlePointerDown(event: PointerEvent) {
    if (
      containerEl &&
      event.target instanceof Node &&
      !containerEl.contains(event.target)
    ) {
      isOpen = false;
    }
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === "Escape") {
      isOpen = false;
    }
  }

  // Svelte 4 reactive statements can't return a cleanup, so toggle the document
  // listeners imperatively as `isOpen` changes and tear them down on destroy.
  $: if (typeof document !== "undefined") {
    if (isOpen) {
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleEscape);
    } else {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    }
  }

  onDestroy(() => {
    if (typeof document !== "undefined") {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    }
  });

  async function handleSignOut() {
    isBusy = true;
    try {
      const response = await fetch("/oauth2/signout", { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Sign out failed with status ${response.status}`);
      }
      user = null;
      isOpen = false;
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      isBusy = false;
    }
  }
</script>

<div class="demo-auth-menu" bind:this={containerEl}>
  <button
    class="demo-auth-trigger"
    disabled={isBusy}
    on:click={() => (isOpen = !isOpen)}
    type="button"
  >
    <span class="demo-auth-trigger-text">{accountLabel}</span>
    <span aria-hidden="true" class="demo-auth-trigger-chevron"
      >{isOpen ? "−" : "+"}</span
    >
  </button>

  {#if isOpen}
    <div class="demo-auth-dropdown">
      {#if user}
        <div class="demo-auth-account-summary">
          <span class="demo-auth-kicker">AbsoluteJS account</span>
          <strong>{accountLabel}</strong>
          {#if user.email}<span>{user.email}</span>{/if}
        </div>
        <button
          class="demo-auth-provider-button demo-auth-provider-button-secondary"
          disabled={isBusy}
          on:click={() => void handleSignOut()}
          type="button"
        >
          <span>Sign out</span>
        </button>
      {:else}
        <div class="demo-auth-account-summary">
          <span class="demo-auth-kicker">AbsoluteJS account</span>
          <strong>Sign in to unlock linked connectors</strong>
          <span
            >Use the same account you linked Gmail, Google Contacts, or Meta
            bindings to in the auth example.</span
          >
        </div>
        <div class="demo-auth-provider-list">
          {#each loginProviders as provider (provider.key)}
            <a class="demo-auth-provider-button" href={provider.href}>
              <img alt="" aria-hidden="true" src={provider.iconPath} />
              <span>Continue with {provider.label}</span>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
