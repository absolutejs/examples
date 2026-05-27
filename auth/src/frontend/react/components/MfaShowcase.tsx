// TOTP enrollment + challenge via authClient.mfa.{setup, verifySetup, challenge}.
// Auto-wires with credentials login when both blocks are enabled: a login attempt that
// returns { status: 'mfa_required' } parks the session until the consumer completes a
// challenge here.

import { useState } from "react";
import { authClient } from "../../shared/authClient";

type Stage = "challenge" | "idle" | "setup-pending" | "setup-verified";

type SetupData = { secret: string; uri: string };

export const MfaShowcase = () => {
  const [stage, setStage] = useState<Stage>("idle");
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleStartSetup = async () => {
    setError(null);
    setNotice(null);
    const result = await authClient.mfa.setup();
    if (result.error) {
      setError(result.error.message);

      return;
    }
    setSetup(result.data);
    setStage("setup-pending");
  };

  const handleVerifySetup = async () => {
    setError(null);
    const result = await authClient.mfa.verifySetup({ code });
    if (result.error) {
      setError(result.error.message);

      return;
    }
    setBackupCodes(result.data.backupCodes);
    setCode("");
    setStage("setup-verified");
    setNotice("Setup verified. Save the backup codes somewhere safe.");
  };

  const handleChallenge = async () => {
    setError(null);
    const result = await authClient.mfa.challenge({ code });
    if (result.error) {
      setError(result.error.message);

      return;
    }
    setCode("");
    setStage("idle");
    setNotice("MFA challenge passed; session promoted.");
  };

  return (
    <section className="auth-section stack">
      <div>
        <h1 className="page-heading">MFA (TOTP)</h1>
        <p className="muted">
          Time-based one-time passwords (RFC 6238). Setup returns an{" "}
          <code>otpauth://</code> URI you can render as a QR code or paste into
          any authenticator app (1Password, Authy, Google Authenticator). The
          challenge route promotes a parked session after a successful login.
        </p>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <h2>Enrollment</h2>
        <button
          className="button primary"
          onClick={() => void handleStartSetup()}
          type="button"
        >
          Start TOTP setup
        </button>

        {setup !== null && (
          <div className="stack" style={{ gap: 4 }}>
            <p className="muted">
              Add this secret to your authenticator app, then enter the
              6-digit code below to verify.
            </p>
            <code style={{ wordBreak: "break-all" }}>{setup.uri}</code>
            <p className="muted">
              Or paste the raw secret manually:{" "}
              <code>{setup.secret}</code>
            </p>
          </div>
        )}

        {(stage === "setup-pending" || stage === "challenge") && (
          <div className="stack" style={{ gap: 8 }}>
            <label className="stack" style={{ gap: 4 }}>
              <span>6-digit code</span>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setCode(event.currentTarget.value)}
                pattern="[0-9]*"
                type="text"
                value={code}
              />
            </label>
            <button
              className="button"
              onClick={() =>
                void (stage === "challenge"
                  ? handleChallenge()
                  : handleVerifySetup())
              }
              type="button"
            >
              {stage === "challenge" ? "Verify challenge" : "Verify setup"}
            </button>
          </div>
        )}

        {backupCodes.length > 0 && (
          <div className="stack" style={{ gap: 4 }}>
            <p>Backup codes (one-time use, store them now):</p>
            <ul style={{ fontFamily: "monospace" }}>
              {backupCodes.map((codeValue) => (
                <li key={codeValue}>{codeValue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <h2>Challenge (after a credentials login returned mfa_required)</h2>
        <button
          className="button"
          onClick={() => setStage("challenge")}
          type="button"
        >
          Switch to challenge mode
        </button>
      </div>

      {error !== null && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {notice !== null && <p className="muted">{notice}</p>}
    </section>
  );
};
