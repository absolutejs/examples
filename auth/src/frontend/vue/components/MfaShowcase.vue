<script setup lang="ts">
// TOTP enrollment + challenge via authClient.mfa.{setup, verifySetup, challenge}.
// Auto-wires with credentials login when both blocks are enabled: a login attempt that
// returns { status: 'mfa_required' } parks the session until the consumer completes a
// challenge here.
import { ref } from "vue";
import { authClient } from "../../shared/authClient";

type Stage = "challenge" | "idle" | "setup-pending" | "setup-verified";
type SetupData = { secret: string; uri: string };

const stage = ref<Stage>("idle");
const setup = ref<SetupData | null>(null);
const backupCodes = ref<string[]>([]);
const code = ref("");
const error = ref<string | null>(null);
const notice = ref<string | null>(null);

const handleStartSetup = async () => {
  error.value = null;
  notice.value = null;
  const result = await authClient.mfa.setup();
  if (result.error) {
    error.value = result.error.message;

    return;
  }
  setup.value = result.data;
  stage.value = "setup-pending";
};

const handleVerifySetup = async () => {
  error.value = null;
  const result = await authClient.mfa.verifySetup({ code: code.value });
  if (result.error) {
    error.value = result.error.message;

    return;
  }
  backupCodes.value = result.data.backupCodes;
  code.value = "";
  stage.value = "setup-verified";
  notice.value = "Setup verified. Save the backup codes somewhere safe.";
};

const handleChallenge = async () => {
  error.value = null;
  const result = await authClient.mfa.challenge({ code: code.value });
  if (result.error) {
    error.value = result.error.message;

    return;
  }
  code.value = "";
  stage.value = "idle";
  notice.value = "MFA challenge passed; session promoted.";
};
</script>

<template>
  <section class="auth-section stack">
    <div>
      <h1 class="page-heading">MFA (TOTP)</h1>
      <p class="muted">
        Time-based one-time passwords (RFC 6238). Setup returns an
        <code>otpauth://</code> URI you can render as a QR code or paste into
        any authenticator app (1Password, Authy, Google Authenticator). The
        challenge route promotes a parked session after a successful login.
      </p>
    </div>

    <div class="stack" style="gap: 12px">
      <h2>Enrollment</h2>
      <button class="button primary" type="button" @click="handleStartSetup">
        Start TOTP setup
      </button>

      <div v-if="setup !== null" class="stack" style="gap: 4px">
        <p class="muted">
          Add this secret to your authenticator app, then enter the 6-digit
          code below to verify.
        </p>
        <code style="word-break: break-all">{{ setup.uri }}</code>
        <p class="muted">
          Or paste the raw secret manually: <code>{{ setup.secret }}</code>
        </p>
      </div>

      <div
        v-if="stage === 'setup-pending' || stage === 'challenge'"
        class="stack"
        style="gap: 8px"
      >
        <label class="stack" style="gap: 4px">
          <span>6-digit code</span>
          <input
            v-model="code"
            autocomplete="one-time-code"
            inputmode="numeric"
            :maxlength="6"
            pattern="[0-9]*"
            type="text"
          />
        </label>
        <button
          class="button"
          type="button"
          @click="stage === 'challenge' ? handleChallenge() : handleVerifySetup()"
        >
          {{ stage === "challenge" ? "Verify challenge" : "Verify setup" }}
        </button>
      </div>

      <div v-if="backupCodes.length > 0" class="stack" style="gap: 4px">
        <p>Backup codes (one-time use, store them now):</p>
        <ul style="font-family: monospace">
          <li v-for="codeValue in backupCodes" :key="codeValue">
            {{ codeValue }}
          </li>
        </ul>
      </div>
    </div>

    <div class="stack" style="gap: 8px">
      <h2>Challenge (after a credentials login returned mfa_required)</h2>
      <button class="button" type="button" @click="stage = 'challenge'">
        Switch to challenge mode
      </button>
    </div>

    <p v-if="error !== null" class="auth-error" role="alert">{{ error }}</p>
    <p v-if="notice !== null" class="muted">{{ notice }}</p>
  </section>
</template>
