<script lang="ts">
  // Magic-link request + verify via authClient.passwordless.{requestMagicLink, verifyMagicLink}.
  // The showcase server logs the magic-link token to stdout (no real mailer); paste it
  // into the verify field to complete the flow.
  import { authClient } from "../../shared/authClient";

  let email = $state("");
  let token = $state("");
  let requested = $state(false);
  let signedIn = $state(false);
  let error = $state<string | null>(null);
  let pending = $state(false);

  const handleRequest = async () => {
    error = null;
    pending = true;
    const result = await authClient.passwordless.requestMagicLink({ email });
    pending = false;
    if (result.error) {
      error = result.error.message;

      return;
    }
    requested = true;
  };

  const handleVerify = async () => {
    error = null;
    pending = true;
    const result = await authClient.passwordless.verifyMagicLink({ token });
    pending = false;
    if (result.error) {
      error = result.error.message;

      return;
    }
    signedIn = true;
  };
</script>

<section class="auth-section stack">
  <div>
    <h1 class="page-heading">Passwordless (magic link)</h1>
    <p class="muted">
      Request a magic link, the server logs the token to stdout in this
      showcase. Paste it into the second field to verify and sign in. Real
      deployments wire the <code>onSendMagicLink</code> hook to a mailer (Brevo
      / SES / etc.).
    </p>
  </div>

  <div class="stack" style="gap: 12px">
    <h2>Request a magic link</h2>
    <label class="stack" style="gap: 4px">
      <span>Email</span>
      <input bind:value={email} autocomplete="email" type="email" />
    </label>
    <button
      class="button primary"
      disabled={pending}
      type="button"
      onclick={handleRequest}
    >
      {pending ? "Sending…" : "Send magic link"}
    </button>
    {#if requested}
      <p class="muted">
        Request accepted — check the server console for the token.
      </p>
    {/if}
  </div>

  <div class="stack" style="gap: 12px">
    <h2>Verify token</h2>
    <label class="stack" style="gap: 4px">
      <span>Token from server console</span>
      <input
        bind:value={token}
        placeholder="paste the magic-link token here"
        type="text"
      />
    </label>
    <button
      class="button"
      disabled={pending}
      type="button"
      onclick={handleVerify}
    >
      {pending ? "Verifying…" : "Sign in"}
    </button>
    {#if signedIn}
      <p>Signed in via magic link — visit Protected to see your session.</p>
    {/if}
  </div>

  {#if error !== null}
    <p class="auth-error" role="alert">{error}</p>
  {/if}
</section>
