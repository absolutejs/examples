<script lang="ts">
  // Email/password sign-up + sign-in via the createAuthClient SDK. The package owns
  // password hashes, breach-check at login, and email-validation rejection at register;
  // this UI is purely the consumer's form + flow choices.
  import { authClient } from "../../shared/authClient";

  type Mode = "register" | "signin";

  let mode = $state<Mode>("signin");
  let email = $state("");
  let password = $state("");
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let pending = $state(false);

  let submitLabel = $derived(
    pending ? "Working…" : mode === "register" ? "Create account" : "Sign in",
  );

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    error = null;
    notice = null;
    pending = true;

    const result =
      mode === "register"
        ? await authClient.signUp.email({ email, password })
        : await authClient.signIn.email({ email, password });

    pending = false;
    if (result.error) {
      error = result.error.message;

      return;
    }
    const { data } = result;
    if (data && "passwordCompromised" in data && data.passwordCompromised) {
      notice =
        "Login succeeded but your password appears in a known breach — reset it from Settings.";

      return;
    }
    if (data && "status" in data && data.status === "mfa_required") {
      notice = "MFA required — open the MFA tab to complete the challenge.";

      return;
    }
    notice =
      mode === "register"
        ? "Registered — check the server console for the verification email."
        : "Signed in — visit Protected to see your session.";
  };
</script>

<section class="auth-section stack">
  <div>
    <h1 class="page-heading">Credentials</h1>
    <p class="muted">
      Email + password. Backed by <code>@absolutejs/auth</code>&apos;s
      credentials block: argon2id hashing via <code>Bun.password</code>, HIBP
      breach check at register + login, disposable-domain rejection via
      <code>validateEmailDeliverability</code>. Emails (verify + reset) log to
      the server console in this showcase.
    </p>
  </div>

  <div class="stack" style="gap: 12px">
    <div role="tablist" style="display: flex; gap: 8px">
      <button
        aria-selected={mode === "signin"}
        class="button"
        type="button"
        onclick={() => (mode = "signin")}
      >
        Sign in
      </button>
      <button
        aria-selected={mode === "register"}
        class="button"
        type="button"
        onclick={() => (mode = "register")}
      >
        Register
      </button>
    </div>

    <form class="stack" style="gap: 12px" onsubmit={handleSubmit}>
      <label class="stack" style="gap: 4px">
        <span>Email</span>
        <input
          bind:value={email}
          autocomplete="username webauthn"
          required
          type="email"
        />
      </label>
      <label class="stack" style="gap: 4px">
        <span>Password</span>
        <input
          bind:value={password}
          autocomplete={mode === "register" ? "new-password" : "current-password"}
          minlength={12}
          required
          type="password"
        />
      </label>
      <button class="button primary" disabled={pending} type="submit">
        {submitLabel}
      </button>
    </form>

    {#if error !== null}
      <p class="auth-error" role="alert">{error}</p>
    {/if}
    {#if notice !== null}
      <p class="muted">{notice}</p>
    {/if}
  </div>
</section>
