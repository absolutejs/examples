// Passkeys via the @absolutejs/auth/react composables shipped in 0.37.0. The autofill
// hook drives WebAuthn conditional-UI (browser surfaces saved passkeys in the autofill
// dropdown); the upgrade-prompt hook lets password users add a passkey post-sign-in.

import { useEffect } from "react";
import {
  usePasskeyAutofill,
  useUpgradeToPasskey,
} from "@absolutejs/auth/react";
import { authClient } from "../../shared/authClient";

export const PasskeysShowcase = () => {
  const autofill = usePasskeyAutofill(authClient);
  const upgrade = useUpgradeToPasskey(authClient);

  // Start conditional-UI on mount. The browser will only prompt the user when they
  // tap the focused <input autocomplete="username webauthn"> — otherwise this is a
  // no-op until a saved passkey is selected.
  useEffect(() => {
    void autofill.start();
  }, [autofill.start]);

  return (
    <section className="auth-section stack">
      <div>
        <h1 className="page-heading">Passkeys</h1>
        <p className="muted">
          WebAuthn passkeys via <code>@absolutejs/auth/react</code>. The
          autofill input shows saved passkeys directly in the browser&apos;s
          autocomplete; the &quot;upgrade to passkey&quot; banner appears only
          when the signed-in user has no passkeys registered.
        </p>
      </div>

      <div className="stack">
        <h2>Conditional-UI sign-in</h2>
        <label className="stack" style={{ gap: 4 }}>
          <span>Email or passkey</span>
          <input
            autoComplete="username webauthn"
            placeholder="Tap to see saved passkeys"
            type="email"
          />
        </label>
        {autofill.isPending && <p className="muted">Waiting for selection…</p>}
        {autofill.data?.status === "authenticated" && (
          <p>Signed in via passkey. Visit Protected to see your session.</p>
        )}
        {autofill.error !== null && (
          <p className="auth-error" role="alert">
            {autofill.error.message}
          </p>
        )}
      </div>

      <div className="stack">
        <h2>Upgrade prompt</h2>
        {upgrade.isPending && <p className="muted">Loading passkeys…</p>}
        {!upgrade.isPending && upgrade.shouldPrompt && (
          <div className="stack">
            <p>
              Save a passkey to this device for faster sign-in next time. One
              tap, no password to remember.
            </p>
            <button
              className="button primary"
              onClick={() => void upgrade.register()}
              type="button"
            >
              Save a passkey
            </button>
          </div>
        )}
        {!upgrade.isPending && !upgrade.shouldPrompt && upgrade.passkeys && (
          <p className="muted">
            You have {upgrade.passkeys.length} passkey
            {upgrade.passkeys.length === 1 ? "" : "s"} registered.
          </p>
        )}
        {upgrade.error !== null && (
          <p className="auth-error" role="alert">
            {upgrade.error.message}
          </p>
        )}
      </div>
    </section>
  );
};
