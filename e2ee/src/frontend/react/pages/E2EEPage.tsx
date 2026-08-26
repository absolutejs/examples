import { useState } from "react";
import { Head } from "@absolutejs/absolute/react/components";
import {
  createAgency,
  createMemoryAgencyStore,
  type PolicyDecisionPoint,
} from "@absolutejs/agency";
import {
  createAgentExchangeReceiver,
  createAgentExchangeSender,
  createMemoryAgentExchangeReplayStore,
  createMemoryAgentExchangeStore,
  type AgentExchangeReceipt,
} from "@absolutejs/agent-exchange";
import { createEmailVerificationCodeSource } from "@absolutejs/agent-exchange-email";
import { selectE2EEProvider, type SecurityMode } from "@absolutejs/e2ee";
import {
  createWebCryptoEnvelopeProvider,
  generateWebCryptoRecipientKeyPair,
} from "@absolutejs/e2ee-webcrypto";

type E2EEPageProps = { cssPath?: string };

type DemoReceipt = AgentExchangeReceipt & {
  readonly ciphertextBytes: number;
  readonly leaseConsumed: true;
  readonly provider: string;
  readonly securityMode: SecurityMode;
};

const approvalPolicy = (): PolicyDecisionPoint => ({
  evaluate: ({ approval, now }) =>
    approval === undefined
      ? {
          decisionId: `decision_${crypto.randomUUID()}`,
          evaluatedAt: now,
          kind: "deny",
          prerequisites: [
            {
              kind: "consent",
              prerequisiteId: "recipient-pairing",
              title: "Approve this exact one-time exchange",
            },
          ],
          reason: "Exact approval is required.",
          requestable: true,
        }
      : {
          decisionId: `decision_${crypto.randomUUID()}`,
          evaluatedAt: now,
          kind: "allow",
        },
});

export const E2EEPage = ({ cssPath }: E2EEPageProps) => {
  const [code, setCode] = useState("482193");
  const [error, setError] = useState<string>();
  const [receipt, setReceipt] = useState<DemoReceipt>();
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

    try {
      const keyPair = await generateWebCryptoRecipientKeyPair();
      const keyHandle = `key_${crypto.randomUUID()}`;
      const provider = createWebCryptoEnvelopeProvider({
        maxPlaintextBytes: 64,
        resolveRecipientPrivateKey: async (handle) =>
          handle === keyHandle ? keyPair.keyMaterial : undefined,
      });
      const selected = selectE2EEProvider([provider], {
        minimumAssurance: "experimental",
        operatorCanDecrypt: false,
        protocols: ["RFC9180-BASE-P256-SHA256-AES128GCM"],
        roles: ["envelope"],
        runtime: "browser",
        securityMode,
      });
      const agency = createAgency({
        policy: approvalPolicy(),
        store: createMemoryAgencyStore(),
      });
      const deliveries: Uint8Array[] = [];
      const submitted: string[] = [];
      const receiver = createAgentExchangeReceiver({
        consent: {
          assertAllows: (request) => ({
            consentId: `paired:${request.requester.agentId}:${request.recipient.agentId}`,
            expiresAt: request.expiresAt,
          }),
        },
        e2ee: selected,
        replay: createMemoryAgentExchangeReplayStore(),
        sink: {
          submit: ({ plaintext }) => {
            const value = new TextDecoder().decode(plaintext);
            if (!/^\d{6}$/u.test(value)) {
              throw new Error("The recipient rejected the protected value.");
            }
            submitted.push(value);
            return { reference: "verification-form", status: "submitted" };
          },
        },
      });
      const emailSource = createEmailVerificationCodeSource({
        lookup: {
          find: (input) =>
            Promise.resolve([
              {
                accountEmail: input.accountEmail,
                authenticationResults: [
                  "mx.mailbox.example; dmarc=pass header.from=example.com",
                ],
                bodyText: `Challenge demo-challenge. Your verification code: ${code}.`,
                direction: "inbound",
                from: { address: "security@example.com" },
                id: "demo-email-message",
                occurredAt: input.notAfter,
                provider: "gmail",
                subject: "Sign in to Example",
                to: [{ address: input.accountEmail }],
              },
            ]),
        },
        profiles: [
          {
            bodyMarkers: ["verification code"],
            correlation: { mode: "challenge-text" },
            id: "accounts-example-six-digit-v1",
            operations: ["verification.submit"],
            origins: ["https://accounts.example.com"],
            providers: ["gmail"],
            senderAddresses: ["security@example.com"],
            senderAuthentication: {
              allowedHeaderFromDomains: ["example.com"],
              trustedAuthservIds: ["mx.mailbox.example"],
            },
            subjectIncludesAny: ["sign in"],
          },
        ],
        resolveAccountEmail: () => "member@example.net",
      });
      const sender = createAgentExchangeSender({
        agency,
        e2ee: selected,
        keyDirectory: {
          resolve: () => ({ keyId: keyHandle, publicKey: keyPair.publicKey }),
        },
        source: emailSource,
        store: createMemoryAgentExchangeStore(),
        transport: {
          deliver: async (delivery) => {
            deliveries.push(delivery.envelope);
            return receiver.receive(delivery);
          },
        },
      });

      const requested = await sender.request({
        expiresAt: Date.now() + 60_000,
        idempotencyKey: crypto.randomUUID(),
        processingMode: "tool-confined",
        purpose: "email.verification.submit",
        recipient: {
          agentId: "recipient-agent",
          authority: "https://auth.recipient.example",
          deviceId: "recipient-browser",
          subject: "recipient-user",
        },
        requester: {
          agentId: "requester-agent",
          authority: "https://auth.requester.example",
          delegationId: "demo-delegation",
          deviceId: "requester-browser",
          subject: "requester-user",
        },
        resource: {
          accountRef: "demo-account",
          challengeId: "demo-challenge",
          operation: "verification.submit",
          origin: "https://accounts.example.com",
          provider: "gmail",
        },
        risk: "authentication",
        secretKind: "email-one-time-code",
      });

      if (
        requested.decision.kind !== "deny" ||
        !requested.decision.requestable
      ) {
        throw new Error("The demo expected an explicit approval checkpoint.");
      }
      await agency.approve({
        actionId: requested.exchange.actionId,
        approvedBy: "requester-user",
        approvedUntil: requested.exchange.expiresAt,
        conditions: { recipientConsentRequired: true },
      });
      const lease = await sender.issueLease(requested.exchange.exchangeId);
      const completed = await sender.execute({
        exchangeId: requested.exchange.exchangeId,
        leaseId: lease.leaseId,
      });
      if (submitted.length !== 1 || deliveries.length !== 1) {
        throw new Error("The one-time exchange invariant failed.");
      }

      setReceipt({
        ...completed.receipt,
        ciphertextBytes: deliveries[0]?.byteLength ?? 0,
        leaseConsumed: true,
        provider: selected.manifest.packageName,
        securityMode,
      });
      setCode("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The protected exchange failed safely.",
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <html lang="en">
      <Head cssPath={cssPath} title="AbsoluteJS Agent Exchange" />
      <body>
        <main>
          <header className="page-header">
            <p className="eyebrow">@absolutejs/agent-exchange · 0.1</p>
            <h1>Let agents use a code without letting models read it.</h1>
            <p className="lead">
              This browser demo runs the real Agency authorization, single-use
              lease, authenticated E2EE envelope, recipient consent, replay
              guard, deterministic sink, and redacted receipt path.
            </p>
          </header>

          <section className="warning" aria-label="Experimental warning">
            <strong>Experimental cryptography provider</strong>
            <span>
              The exchange protocol is real; the same-page tools, transport, and
              in-memory stores are demonstration adapters, not a production OTP
              relay.
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
                <span>Only the paired recipient key opens the envelope.</span>
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
                <span>Requires a declared recovery-authority provider.</span>
              </label>
            </div>
          </section>

          <section className="exchange-grid">
            <div className="panel">
              <div className="step">2 · Deterministic source tool</div>
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
                {running
                  ? "Authorizing and protecting…"
                  : "Approve and exchange once"}
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
              <div className="step">3 · Agent-visible receipt only</div>
              {receipt === undefined ? (
                <p className="empty">No exchange has completed.</p>
              ) : (
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{receipt.status}</dd>
                  </div>
                  <div>
                    <dt>Lease consumed</dt>
                    <dd>{receipt.leaseConsumed ? "yes" : "no"}</dd>
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
            The agent receives authorization state and a typed completion
            receipt. The six-digit value exists only inside the source,
            encrypted envelope, and recipient sink boundaries.
          </footer>
        </main>
      </body>
    </html>
  );
};
