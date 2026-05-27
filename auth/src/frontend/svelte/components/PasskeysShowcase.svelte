<script lang="ts">
  // Passkeys via the @absolutejs/auth/svelte composables shipped in 0.37.0. The
  // autofill hook drives WebAuthn conditional-UI (browser surfaces saved passkeys in
  // the autofill dropdown); the upgrade-prompt hook lets password users add a passkey
  // post-sign-in.
  import {
    usePasskeyAutofill,
    useUpgradeToPasskey,
  } from "@absolutejs/auth/svelte";
  import { onMount } from "svelte";
  import { authClient } from "../../shared/authClient";

  // Destructure each Writable<T> so the $-prefix store syntax works on them
  // individually (the composable return object itself isn't a SvelteStore).
  const {
    data: autofillData,
    error: autofillError,
    isPending: autofillPending,
    start: startAutofill,
  } = usePasskeyAutofill(authClient);
  const {
    error: upgradeError,
    isPending: upgradePending,
    passkeys: upgradePasskeys,
    register: registerPasskey,
    shouldPrompt: upgradeShouldPrompt,
  } = useUpgradeToPasskey(authClient);

  // Start conditional-UI on mount. The browser will only prompt the user when they
  // tap the focused <input autocomplete="username webauthn"> — otherwise this is a
  // no-op until a saved passkey is selected.
  onMount(() => {
    void startAutofill();
  });
</script>

<section class="auth-section stack">
  <div>
    <h1 class="page-heading">Passkeys</h1>
    <p class="muted">
      WebAuthn passkeys via <code>@absolutejs/auth/svelte</code>. The autofill
      input shows saved passkeys directly in the browser&apos;s autocomplete;
      the &quot;upgrade to passkey&quot; banner appears only when the signed-in
      user has no passkeys registered.
    </p>
  </div>

  <div class="stack">
    <h2>Conditional-UI sign-in</h2>
    <label class="stack" style="gap: 4px">
      <span>Email or passkey</span>
      <input
        autocomplete="username webauthn"
        placeholder="Tap to see saved passkeys"
        type="email"
      />
    </label>
    {#if $autofillPending}
      <p class="muted">Waiting for selection…</p>
    {/if}
    {#if $autofillData?.status === "authenticated"}
      <p>Signed in via passkey. Visit Protected to see your session.</p>
    {/if}
    {#if $autofillError !== null}
      <p class="auth-error" role="alert">{$autofillError.message}</p>
    {/if}
  </div>

  <div class="stack">
    <h2>Upgrade prompt</h2>
    {#if $upgradePending}
      <p class="muted">Loading passkeys…</p>
    {/if}
    {#if !$upgradePending && $upgradeShouldPrompt}
      <div class="stack">
        <p>
          Save a passkey to this device for faster sign-in next time. One tap,
          no password to remember.
        </p>
        <button class="button primary" type="button" onclick={registerPasskey}>
          Save a passkey
        </button>
      </div>
    {/if}
    {#if !$upgradePending && !$upgradeShouldPrompt && $upgradePasskeys}
      <p class="muted">
        You have {$upgradePasskeys.length} passkey{$upgradePasskeys.length ===
        1
          ? ""
          : "s"} registered.
      </p>
    {/if}
    {#if $upgradeError !== null}
      <p class="auth-error" role="alert">{$upgradeError.message}</p>
    {/if}
  </div>
</section>
