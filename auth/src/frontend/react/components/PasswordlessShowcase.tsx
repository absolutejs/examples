// Magic-link request + verify via authClient.passwordless.{requestMagicLink, verifyMagicLink}.
// The showcase server logs the magic-link token to stdout (no real mailer); paste it
// into the verify field to complete the flow.

import { useState } from "react";
import { authClient } from "../../shared/authClient";

export const PasswordlessShowcase = () => {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [requested, setRequested] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleRequest = async () => {
    setError(null);
    setPending(true);
    const result = await authClient.passwordless.requestMagicLink({ email });
    setPending(false);
    if (result.error) {
      setError(result.error.message);

      return;
    }
    setRequested(true);
  };

  const handleVerify = async () => {
    setError(null);
    setPending(true);
    const result = await authClient.passwordless.verifyMagicLink({ token });
    setPending(false);
    if (result.error) {
      setError(result.error.message);

      return;
    }
    setSignedIn(true);
  };

  return (
    <section className="auth-section stack">
      <div>
        <h1 className="page-heading">Passwordless (magic link)</h1>
        <p className="muted">
          Request a magic link, the server logs the token to stdout in this
          showcase. Paste it into the second field to verify and sign in. Real
          deployments wire the <code>onSendMagicLink</code> hook to a mailer
          (Brevo / SES / etc.).
        </p>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <h2>Request a magic link</h2>
        <label className="stack" style={{ gap: 4 }}>
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            type="email"
            value={email}
          />
        </label>
        <button
          className="button primary"
          disabled={pending}
          onClick={() => void handleRequest()}
          type="button"
        >
          {pending ? "Sending…" : "Send magic link"}
        </button>
        {requested && (
          <p className="muted">
            Request accepted — check the server console for the token.
          </p>
        )}
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <h2>Verify token</h2>
        <label className="stack" style={{ gap: 4 }}>
          <span>Token from server console</span>
          <input
            onChange={(event) => setToken(event.currentTarget.value)}
            placeholder="paste the magic-link token here"
            type="text"
            value={token}
          />
        </label>
        <button
          className="button"
          disabled={pending}
          onClick={() => void handleVerify()}
          type="button"
        >
          {pending ? "Verifying…" : "Sign in"}
        </button>
        {signedIn && (
          <p>Signed in via magic link — visit Protected to see your session.</p>
        )}
      </div>

      {error !== null && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
};
