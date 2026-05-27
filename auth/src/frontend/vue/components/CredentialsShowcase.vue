<script setup lang="ts">
// Email/password sign-up + sign-in via the createAuthClient SDK. The package owns
// password hashes, breach-check at login, and email-validation rejection at register;
// this UI is purely the consumer's form + flow choices.
import { computed, ref } from "vue";
import { authClient } from "../../shared/authClient";

type Mode = "register" | "signin";

const mode = ref<Mode>("signin");
const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const notice = ref<string | null>(null);
const pending = ref(false);

const submitLabel = computed(() => {
  if (pending.value) return "Working…";

  return mode.value === "register" ? "Create account" : "Sign in";
});

const handleSubmit = async () => {
  error.value = null;
  notice.value = null;
  pending.value = true;

  const result =
    mode.value === "register"
      ? await authClient.signUp.email({
          email: email.value,
          password: password.value,
        })
      : await authClient.signIn.email({
          email: email.value,
          password: password.value,
        });

  pending.value = false;
  if (result.error) {
    error.value = result.error.message;

    return;
  }
  const { data } = result;
  if (data && "passwordCompromised" in data && data.passwordCompromised) {
    notice.value =
      "Login succeeded but your password appears in a known breach — reset it from Settings.";

    return;
  }
  if (data && "status" in data && data.status === "mfa_required") {
    notice.value =
      "MFA required — open the MFA tab to complete the challenge.";

    return;
  }
  notice.value =
    mode.value === "register"
      ? "Registered — check the server console for the verification email."
      : "Signed in — visit Protected to see your session.";
};
</script>

<template>
  <section class="auth-section stack">
    <div>
      <h1 class="page-heading">Credentials</h1>
      <p class="muted">
        Email + password. Backed by <code>@absolutejs/auth</code>&apos;s
        credentials block: argon2id hashing via <code>Bun.password</code>, HIBP
        breach check at register + login, disposable-domain rejection via
        <code>validateEmailDeliverability</code>. Emails (verify + reset) log
        to the server console in this showcase.
      </p>
    </div>

    <div class="stack" style="gap: 12px">
      <div role="tablist" style="display: flex; gap: 8px">
        <button
          :aria-selected="mode === 'signin'"
          class="button"
          type="button"
          @click="mode = 'signin'"
        >
          Sign in
        </button>
        <button
          :aria-selected="mode === 'register'"
          class="button"
          type="button"
          @click="mode = 'register'"
        >
          Register
        </button>
      </div>

      <form class="stack" style="gap: 12px" @submit.prevent="handleSubmit">
        <label class="stack" style="gap: 4px">
          <span>Email</span>
          <input
            v-model="email"
            autocomplete="username webauthn"
            required
            type="email"
          />
        </label>
        <label class="stack" style="gap: 4px">
          <span>Password</span>
          <input
            v-model="password"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
            :minlength="12"
            required
            type="password"
          />
        </label>
        <button class="button primary" :disabled="pending" type="submit">
          {{ submitLabel }}
        </button>
      </form>

      <p v-if="error !== null" class="auth-error" role="alert">{{ error }}</p>
      <p v-if="notice !== null" class="muted">{{ notice }}</p>
    </div>
  </section>
</template>
