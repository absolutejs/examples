import { useRef, useState } from "react";
import { Head } from "@absolutejs/absolute/react/components";
import { selectE2EEProvider, type SecurityMode } from "@absolutejs/e2ee";
import {
  createWebCryptoEnvelopeProvider,
  generateWebCryptoRecipientKeyPair,
  type WebCryptoRecipientKeyMaterial,
} from "@absolutejs/e2ee-webcrypto";

type E2EEPageProps = {
  cssPath?: string;
};

type ExchangeReceipt = {
  ciphertextBytes: number;
  modelObservedSecret: false;
  processingMode: "tool-confined";
  provider: string;
  purpose: "email.verification.submit";
  requestId: string;
  securityMode: SecurityMode;
  status: "submitted";
};

const equalBytes = (left: Uint8Array, right: Uint8Array): boolean => {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
};

export const E2EEPage = ({ cssPath }: E2EEPageProps) => {
  const keys = useRef(new Map<string, WebCryptoRecipientKeyMaterial>());
  const [code, setCode] = useState("482193");
  const [error, setError] = useState<string>();
  const [receipt, setReceipt] = useState<ExchangeReceipt>();
  const [running, setRunning] = useState(false);
  const [securityMode, setSecurityMode] = useState<SecurityMode>("strict-e2ee");

  const runExchange = async () => {
    if (!/^\d{6}$/u.test(code)) {
      setError("Enter exactly six digits.");
      return;
    }
    if (securityMode === "managed-recovery") {
      setError(
        "Managed recovery is intentionally gated until a recovery authority provider is configured.",
      );
      return;
    }

    setError(undefined);
    setReceipt(undefined);
    setRunning(true);
    const plaintext = new TextEncoder().encode(code);
    let opened: Uint8Array | undefined;

    try {
      const recipient = await generateWebCryptoRecipientKeyPair();
      const keyHandle = crypto.randomUUID();
      keys.current.set(keyHandle, recipient.keyMaterial);

      const provider = createWebCryptoEnvelopeProvider({
        maxPlaintextBytes: 64,
        resolveRecipientPrivateKey: async (handle) => keys.current.get(handle),
      });
      const selected = selectE2EEProvider([provider], {
        minimumAssurance: "experimental",
        operatorCanDecrypt: false,
        protocols: ["RFC9180-BASE-P256-SHA256-AES128GCM"],
        roles: ["envelope"],
        runtime: "browser",
        securityMode,
      });
      const requestId = crypto.randomUUID();
      const authenticatedContext = {
        conversationId: requestId,
        expiresAt: Date.now() + 60_000,
        purpose: "email.verification.submit",
        securityEpoch: 0,
        senderId: "demo-source-tool",
      } as const;
      const envelope = await selected.seal({
        authenticatedContext,
        plaintext,
        recipientPublicKey: recipient.publicKey,
      });

      opened = await selected.open({
        envelope,
        expectedContext: authenticatedContext,
        recipientKeyHandle: keyHandle,
      });
      if (!equalBytes(plaintext, opened)) {
        throw new Error("Recipient tool rejected the protected value.");
      }

      setReceipt({
        ciphertextBytes: envelope.length,
        modelObservedSecret: false,
        processingMode: "tool-confined",
        provider: selected.manifest.packageName,
        purpose: authenticatedContext.purpose,
        requestId,
        securityMode,
        status: "submitted",
      });
      setCode("");
      keys.current.delete(keyHandle);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Exchange failed.");
    } finally {
      plaintext.fill(0);
      opened?.fill(0);
      setRunning(false);
    }
  };

  return (
    <html lang="en">
      <Head cssPath={cssPath} title="AbsoluteJS E2EE" />
      <body>
        <main>
          <header className="page-header">
            <p className="eyebrow">@absolutejs/e2ee · 0.x</p>
            <h1>Verified exchange without showing the agent the secret.</h1>
            <p className="lead">
              This browser-only architecture demo selects an envelope provider
              explicitly, binds a six-digit value to one purpose and expiry, and
              gives the model only a receipt.
            </p>
          </header>

          <section className="warning" aria-label="Experimental warning">
            <strong>Experimental provider</strong>
            <span>
              This demonstrates the trust boundary; it is not an audited
              messaging or production OTP system.
            </span>
          </section>

          <section className="mode-section">
            <h2>1. Choose the confidentiality mode</h2>
            <div className="mode-grid">
              <label
                className={
                  securityMode === "strict-e2ee" ? "mode active" : "mode"
                }
              >
                <input
                  checked={securityMode === "strict-e2ee"}
                  name="security-mode"
                  onChange={() => setSecurityMode("strict-e2ee")}
                  type="radio"
                />
                <strong>Strict E2EE</strong>
                <span>Only the recipient key can open this envelope.</span>
              </label>
              <label
                className={
                  securityMode === "managed-recovery" ? "mode active" : "mode"
                }
              >
                <input
                  checked={securityMode === "managed-recovery"}
                  name="security-mode"
                  onChange={() => setSecurityMode("managed-recovery")}
                  type="radio"
                />
                <strong>Managed recovery</strong>
                <span>
                  Visible but gated: a declared recovery provider is required.
                </span>
              </label>
            </div>
          </section>

          <section className="exchange-grid">
            <div className="panel">
              <div className="step">2 · Trusted source tool</div>
              <label htmlFor="code">Six-digit email code</label>
              <input
                autoComplete="one-time-code"
                id="code"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setCode(event.target.value)}
                pattern="[0-9]{6}"
                type="password"
                value={code}
              />
              <button disabled={running} onClick={runExchange} type="button">
                {running ? "Protecting…" : "Run tool-confined exchange"}
              </button>
              {error === undefined ? null : (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="arrow" aria-hidden="true">
              →
            </div>

            <div className="panel receipt-panel">
              <div className="step">3 · Agent-visible receipt</div>
              {receipt === undefined ? (
                <p className="empty">No exchange has completed.</p>
              ) : (
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{receipt.status}</dd>
                  </div>
                  <div>
                    <dt>Processing</dt>
                    <dd>{receipt.processingMode}</dd>
                  </div>
                  <div>
                    <dt>Model saw secret</dt>
                    <dd>{receipt.modelObservedSecret ? "yes" : "no"}</dd>
                  </div>
                  <div>
                    <dt>Ciphertext</dt>
                    <dd>{receipt.ciphertextBytes} bytes</dd>
                  </div>
                  <div>
                    <dt>Provider</dt>
                    <dd>{receipt.provider}</dd>
                  </div>
                </dl>
              )}
            </div>
          </section>

          <footer>
            Production Agent Exchange will add Auth identity, Agency single-use
            leases, A2A transport, deterministic email retrieval, and auditable
            receipts around this protected payload path.
          </footer>
        </main>
      </body>
    </html>
  );
};
