// Email/password sign-up + sign-in via the createAuthClient SDK. The package owns
// password hashes, breach-check at login, and email-validation rejection at register;
// this UI is purely the consumer's form + flow choices.

import { type FormEvent, useState } from "react";
import { authClient } from "../../shared/authClient";

type Mode = "register" | "signin";

const submitLabel = (pending: boolean, mode: Mode) => {
  if (pending) return "Working…";

  return mode === "register" ? "Create account" : "Sign in";
};

export const CredentialsShowcase = () => {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const result =
      mode === "register"
        ? await authClient.signUp.email({ email, password })
        : await authClient.signIn.email({ email, password });

    setPending(false);
    if (result.error) {
      setError(result.error.message);

      return;
    }
    const {data} = result;
    if (data && "passwordCompromised" in data && data.passwordCompromised) {
      setNotice(
        "Login succeeded but your password appears in a known breach — reset it from Settings.",
      );

      return;
    }
    if (data && "status" in data && data.status === "mfa_required") {
      setNotice("MFA required — open the MFA tab to complete the challenge.");

      return;
    }
    setNotice(
      mode === "register"
        ? "Registered — check the server console for the verification email."
        : "Signed in — visit Protected to see your session.",
    );
  };

  return (
    <section className="auth-section stack">
      <div>
        <h1 className="page-heading">Credentials</h1>
        <p className="muted">
          Email + password. Backed by{" "}
          <code>@absolutejs/auth</code>&apos;s credentials block: argon2id
          hashing via <code>Bun.password</code>, HIBP breach check at register +
          login, disposable-domain rejection via{" "}
          <code>validateEmailDeliverability</code>. Emails (verify + reset) log
          to the server console in this showcase.
        </p>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <div role="tablist" style={{ display: "flex", gap: 8 }}>
          <button
            aria-selected={mode === "signin"}
            className="button"
            onClick={() => setMode("signin")}
            type="button"
          >
            Sign in
          </button>
          <button
            aria-selected={mode === "register"}
            className="button"
            onClick={() => setMode("register")}
            type="button"
          >
            Register
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit} style={{ gap: 12 }}>
          <label className="stack" style={{ gap: 4 }}>
            <span>Email</span>
            <input
              autoComplete="username webauthn"
              onChange={(event) => setEmail(event.currentTarget.value)}
              required={true}
              type="email"
              value={email}
            />
          </label>
          <label className="stack" style={{ gap: 4 }}>
            <span>Password</span>
            <input
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              minLength={12}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required={true}
              type="password"
              value={password}
            />
          </label>
          <button className="button primary" disabled={pending} type="submit">
            {submitLabel(pending, mode)}
          </button>
        </form>

        {error !== null && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {notice !== null && <p className="muted">{notice}</p>}
      </div>
    </section>
  );
};
