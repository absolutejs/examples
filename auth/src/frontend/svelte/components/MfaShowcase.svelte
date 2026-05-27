<script lang="ts">
  // TOTP enrollment + challenge via authClient.mfa.{setup, verifySetup, challenge}.
  // Auto-wires with credentials login when both blocks are enabled: a login attempt
  // that returns { status: 'mfa_required' } parks the session until the consumer
  // completes a challenge here.
  import { authClient } from "../../shared/authClient";

  type Stage = "challenge" | "idle" | "setup-pending" | "setup-verified";
  type SetupData = { secret: string; uri: string };

  let stage = $state<Stage>("idle");
  let setup = $state<SetupData | null>(null);
  let backupCodes = $state<string[]>([]);
  let code = $state("");
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);

  const handleStartSetup = async () => {
    error = null;
    notice = null;
    const result = await authClient.mfa.setup();
    if (result.error) {
      error = result.error.message;

      return;
    }
    setup = result.data;
    stage = "setup-pending";
  };

  const handleVerifySetup = async () => {
    error = null;
    const result = await authClient.mfa.verifySetup({ code });
    if (result.error) {
      error = result.error.message;

      return;
    }
    backupCodes = result.data.backupCodes;
    code = "";
    stage = "setup-verified";
    notice = "Setup verified. Save the backup codes somewhere safe.";
  };

  const handleChallenge = async () => {
    error = null;
    const result = await authClient.mfa.challenge({ code });
    if (result.error) {
      error = result.error.message;

      return;
    }
    code = "";
    stage = "idle";
    notice = "MFA challenge passed; session promoted.";
  };
</script>

<section class="auth-section stack">
  <div>
    <h1 class="page-heading">MFA (TOTP)</h1>
    <p class="muted">
      Time-based one-time passwords (RFC 6238). Setup returns an
      <code>otpauth://</code> URI you can render as a QR code or paste into any
      authenticator app (1Password, Authy, Google Authenticator). The challenge
      route promotes a parked session after a successful login.
    </p>
  </div>

  <div class="stack" style="gap: 12px">
    <h2>Enrollment</h2>
    <button class="button primary" type="button" onclick={handleStartSetup}>
      Start TOTP setup
    </button>

    {#if setup !== null}
      <div class="stack" style="gap: 4px">
        <p class="muted">
          Add this secret to your authenticator app, then enter the 6-digit
          code below to verify.
        </p>
        <code style="word-break: break-all">{setup.uri}</code>
        <p class="muted">
          Or paste the raw secret manually: <code>{setup.secret}</code>
        </p>
      </div>
    {/if}

    {#if stage === "setup-pending" || stage === "challenge"}
      <div class="stack" style="gap: 8px">
        <label class="stack" style="gap: 4px">
          <span>6-digit code</span>
          <input
            bind:value={code}
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="6"
            pattern="[0-9]*"
            type="text"
          />
        </label>
        <button
          class="button"
          type="button"
          onclick={() =>
            stage === "challenge" ? handleChallenge() : handleVerifySetup()}
        >
          {stage === "challenge" ? "Verify challenge" : "Verify setup"}
        </button>
      </div>
    {/if}

    {#if backupCodes.length > 0}
      <div class="stack" style="gap: 4px">
        <p>Backup codes (one-time use, store them now):</p>
        <ul style="font-family: monospace">
          {#each backupCodes as codeValue (codeValue)}
            <li>{codeValue}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  <div class="stack" style="gap: 8px">
    <h2>Challenge (after a credentials login returned mfa_required)</h2>
    <button class="button" type="button" onclick={() => (stage = "challenge")}>
      Switch to challenge mode
    </button>
  </div>

  {#if error !== null}
    <p class="auth-error" role="alert">{error}</p>
  {/if}
  {#if notice !== null}
    <p class="muted">{notice}</p>
  {/if}
</section>
