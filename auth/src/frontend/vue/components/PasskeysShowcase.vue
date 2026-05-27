<script setup lang="ts">
// Passkeys via the @absolutejs/auth/vue composables shipped in 0.37.0. The autofill
// hook drives WebAuthn conditional-UI (browser surfaces saved passkeys in the autofill
// dropdown); the upgrade-prompt hook lets password users add a passkey post-sign-in.
import { usePasskeyAutofill, useUpgradeToPasskey } from "@absolutejs/auth/vue";
import { onMounted } from "vue";
import { authClient } from "../../shared/authClient";

const autofill = usePasskeyAutofill(authClient);
const upgrade = useUpgradeToPasskey(authClient);

// Start conditional-UI on mount. The browser will only prompt the user when they
// tap the focused <input autocomplete="username webauthn"> — otherwise this is a
// no-op until a saved passkey is selected.
onMounted(() => {
  void autofill.start();
});
</script>

<template>
  <section class="auth-section stack">
    <div>
      <h1 class="page-heading">Passkeys</h1>
      <p class="muted">
        WebAuthn passkeys via <code>@absolutejs/auth/vue</code>. The autofill
        input shows saved passkeys directly in the browser&apos;s autocomplete;
        the &quot;upgrade to passkey&quot; banner appears only when the
        signed-in user has no passkeys registered.
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
      <p v-if="autofill.isPending.value" class="muted">
        Waiting for selection…
      </p>
      <p v-if="autofill.data.value?.status === 'authenticated'">
        Signed in via passkey. Visit Protected to see your session.
      </p>
      <p v-if="autofill.error.value !== null" class="auth-error" role="alert">
        {{ autofill.error.value.message }}
      </p>
    </div>

    <div class="stack">
      <h2>Upgrade prompt</h2>
      <p v-if="upgrade.isPending.value" class="muted">Loading passkeys…</p>
      <div
        v-if="!upgrade.isPending.value && upgrade.shouldPrompt.value"
        class="stack"
      >
        <p>
          Save a passkey to this device for faster sign-in next time. One tap,
          no password to remember.
        </p>
        <button
          class="button primary"
          type="button"
          @click="upgrade.register()"
        >
          Save a passkey
        </button>
      </div>
      <p
        v-if="
          !upgrade.isPending.value &&
          !upgrade.shouldPrompt.value &&
          upgrade.passkeys.value
        "
        class="muted"
      >
        You have {{ upgrade.passkeys.value.length }} passkey{{
          upgrade.passkeys.value.length === 1 ? "" : "s"
        }}
        registered.
      </p>
      <p v-if="upgrade.error.value !== null" class="auth-error" role="alert">
        {{ upgrade.error.value.message }}
      </p>
    </div>
  </section>
</template>
