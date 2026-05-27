<script setup lang="ts">
// Magic-link request + verify via authClient.passwordless.{requestMagicLink, verifyMagicLink}.
// The showcase server logs the magic-link token to stdout (no real mailer); paste it
// into the verify field to complete the flow.
import { ref } from "vue";
import { authClient } from "../../shared/authClient";

const email = ref("");
const token = ref("");
const requested = ref(false);
const signedIn = ref(false);
const error = ref<string | null>(null);
const pending = ref(false);

const handleRequest = async () => {
  error.value = null;
  pending.value = true;
  const result = await authClient.passwordless.requestMagicLink({
    email: email.value,
  });
  pending.value = false;
  if (result.error) {
    error.value = result.error.message;

    return;
  }
  requested.value = true;
};

const handleVerify = async () => {
  error.value = null;
  pending.value = true;
  const result = await authClient.passwordless.verifyMagicLink({
    token: token.value,
  });
  pending.value = false;
  if (result.error) {
    error.value = result.error.message;

    return;
  }
  signedIn.value = true;
};
</script>

<template>
  <section class="auth-section stack">
    <div>
      <h1 class="page-heading">Passwordless (magic link)</h1>
      <p class="muted">
        Request a magic link, the server logs the token to stdout in this
        showcase. Paste it into the second field to verify and sign in. Real
        deployments wire the <code>onSendMagicLink</code> hook to a mailer
        (Brevo / SES / etc.).
      </p>
    </div>

    <div class="stack" style="gap: 12px">
      <h2>Request a magic link</h2>
      <label class="stack" style="gap: 4px">
        <span>Email</span>
        <input v-model="email" autocomplete="email" type="email" />
      </label>
      <button
        class="button primary"
        :disabled="pending"
        type="button"
        @click="handleRequest"
      >
        {{ pending ? "Sending…" : "Send magic link" }}
      </button>
      <p v-if="requested" class="muted">
        Request accepted — check the server console for the token.
      </p>
    </div>

    <div class="stack" style="gap: 12px">
      <h2>Verify token</h2>
      <label class="stack" style="gap: 4px">
        <span>Token from server console</span>
        <input
          v-model="token"
          placeholder="paste the magic-link token here"
          type="text"
        />
      </label>
      <button
        class="button"
        :disabled="pending"
        type="button"
        @click="handleVerify"
      >
        {{ pending ? "Verifying…" : "Sign in" }}
      </button>
      <p v-if="signedIn">
        Signed in via magic link — visit Protected to see your session.
      </p>
    </div>

    <p v-if="error !== null" class="auth-error" role="alert">{{ error }}</p>
  </section>
</template>
