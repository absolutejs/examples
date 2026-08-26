import { useState } from "react";
import { Head } from "@absolutejs/absolute/react/components";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

type PhishingResistantPageProps = { readonly cssPath?: string };

type SafeReceipt = {
  readonly exchangeId: string;
  readonly modelObservedSecret: false;
  readonly processingMode: "tool-confined";
  readonly protocol: {
    readonly accessTokenSenderConstrained: true;
    readonly authorizationDetailsBound: true;
    readonly nonceRetryObserved: boolean;
    readonly parUsed: true;
    readonly pkceS256Verified: boolean;
    readonly resourceIndicatorBound: true;
  };
  readonly reference?: string;
  readonly status: "submitted";
};

type SafeEmailReceipt = {
  readonly assuranceMode: "passkey-approved-bearer-secret";
  readonly exchangeId: string;
  readonly maximumUses: 1;
  readonly modelObservedSecret: false;
  readonly processingMode: "tool-confined";
  readonly reference?: string;
  readonly status: "submitted";
};

type StandingMandate = {
  readonly expiresAt: number;
  readonly mandateId: string;
  readonly maximumUses: number;
  readonly status: "authorized";
  readonly usesRemaining: number;
};

type StandingMandateReceipt = {
  readonly assuranceMode: "passkey-enrolled-standing-mandate";
  readonly exchangeId: string;
  readonly mandateId: string;
  readonly modelObservedSecret: false;
  readonly processingMode: "tool-confined";
  readonly status: "submitted";
  readonly usesRemaining: number;
};

const api = async <Result,>(
  path: string,
  sessionToken?: string,
  body?: unknown,
): Promise<Result> => {
  const response = await fetch(path, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(sessionToken === undefined ? {} : { "x-demo-session": sessionToken }),
    },
    method: "POST",
  });
  const value = (await response.json()) as Result & { readonly error?: string };
  if (!response.ok)
    throw new Error(value.error ?? "The secure operation failed.");
  return value;
};

export const PhishingResistantPage = ({
  cssPath,
}: PhishingResistantPageProps) => {
  const [error, setError] = useState<string>();
  const [emailReceipt, setEmailReceipt] = useState<SafeEmailReceipt>();
  const [passkeyReady, setPasskeyReady] = useState(false);
  const [receipt, setReceipt] = useState<SafeReceipt>();
  const [running, setRunning] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>();
  const [standingMandate, setStandingMandate] = useState<StandingMandate>();
  const [standingReceipt, setStandingReceipt] =
    useState<StandingMandateReceipt>();

  const ensureSession = async (): Promise<string> => {
    if (sessionToken !== undefined) return sessionToken;
    const created = await api<{ readonly sessionToken: string }>(
      "/api/session",
    );
    setSessionToken(created.sessionToken);
    return created.sessionToken;
  };

  const registerPasskey = async () => {
    setError(undefined);
    setRunning(true);
    try {
      const token = await ensureSession();
      const optionsJSON = await api<
        Parameters<typeof startRegistration>[0]["optionsJSON"]
      >("/api/passkeys/options", token);
      const response = await startRegistration({ optionsJSON });
      await api("/api/passkeys/verify", token, { response });
      setPasskeyReady(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Passkey setup failed.",
      );
    } finally {
      setRunning(false);
    }
  };

  const runExchange = async () => {
    setError(undefined);
    setReceipt(undefined);
    setRunning(true);
    try {
      const token = await ensureSession();
      const begun = await api<{
        readonly exchangeId: string;
        readonly options: Parameters<
          typeof startAuthentication
        >[0]["optionsJSON"];
      }>("/api/exchanges", token);
      const response = await startAuthentication({
        optionsJSON: begun.options,
      });
      const completed = await api<SafeReceipt>(
        "/api/exchanges/approve",
        token,
        { exchangeId: begun.exchangeId, response },
      );
      setReceipt(completed);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The exchange failed safely.",
      );
    } finally {
      setRunning(false);
    }
  };

  const runEmailExchange = async () => {
    setError(undefined);
    setEmailReceipt(undefined);
    setRunning(true);
    try {
      const token = await ensureSession();
      const begun = await api<{
        readonly exchangeId: string;
        readonly options: Parameters<
          typeof startAuthentication
        >[0]["optionsJSON"];
      }>("/api/email-exchanges", token);
      const response = await startAuthentication({
        optionsJSON: begun.options,
      });
      setEmailReceipt(
        await api<SafeEmailReceipt>("/api/email-exchanges/approve", token, {
          exchangeId: begun.exchangeId,
          response,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The email exchange failed safely.",
      );
    } finally {
      setRunning(false);
    }
  };

  const enrollStandingMandate = async () => {
    setError(undefined);
    setStandingReceipt(undefined);
    setRunning(true);
    try {
      const token = await ensureSession();
      const begun = await api<{
        readonly mandateId: string;
        readonly options: Parameters<
          typeof startAuthentication
        >[0]["optionsJSON"];
      }>("/api/standing-mandates", token);
      const response = await startAuthentication({
        optionsJSON: begun.options,
      });
      setStandingMandate(
        await api<StandingMandate>("/api/standing-mandates/approve", token, {
          mandateId: begun.mandateId,
          response,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Standing authorization failed safely.",
      );
    } finally {
      setRunning(false);
    }
  };

  const executeStandingMandate = async () => {
    if (standingMandate === undefined) return;
    setError(undefined);
    setRunning(true);
    try {
      const token = await ensureSession();
      const completed = await api<StandingMandateReceipt>(
        "/api/standing-mandates/execute",
        token,
        { mandateId: standingMandate.mandateId },
      );
      setStandingReceipt(completed);
      setStandingMandate({
        ...standingMandate,
        usesRemaining: completed.usesRemaining,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Delegated execution failed safely.",
      );
    } finally {
      setRunning(false);
    }
  };

  const revokeStandingMandate = async () => {
    if (standingMandate === undefined) return;
    setError(undefined);
    setRunning(true);
    try {
      const token = await ensureSession();
      await api("/api/standing-mandates/revoke", token, {
        mandateId: standingMandate.mandateId,
      });
      setStandingMandate(undefined);
      setStandingReceipt(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Mandate revocation failed safely.",
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <html lang="en">
      <Head cssPath={cssPath} title="Phishing-resistant Agent Exchange" />
      <body>
        <main>
          <header>
            <p className="eyebrow">AbsoluteJS · passkey + PAR + PKCE + DPoP</p>
            <h1>Agents can ask. Your passkey decides.</h1>
            <p className="lead">
              A requester agent asks a paired recipient agent to perform one
              exact action. A verifier-bound passkey approval authorizes a
              one-use, purpose-bound exchange; neither model receives the
              authorization code, access token, or protected value.
            </p>
          </header>

          <section className="boundary">
            <strong>Real security ceremonies, simulated service</strong>
            <span>
              WebAuthn and WebCrypto are real. The authorization server and
              protected API run in-process so the complete RFC profile is
              testable without a vendor account. HTTP is accepted only on
              localhost.
            </span>
          </section>

          <section className="flow" aria-label="Agent exchange flow">
            <article>
              <span>1</span>
              <h2>Register your passkey</h2>
              <p>
                The RP ID and browser origin are checked at verification time.
              </p>
              <button
                disabled={running || passkeyReady}
                onClick={registerPasskey}
                type="button"
              >
                {passkeyReady ? "Passkey ready" : "Create passkey"}
              </button>
            </article>
            <article>
              <span>2</span>
              <h2>Approve the exact request</h2>
              <p>
                The signed challenge is a digest of the agent, purpose,
                resource, and expiry.
              </p>
              <button
                disabled={running || !passkeyReady}
                onClick={runExchange}
                type="button"
              >
                {running
                  ? "Waiting for secure approval…"
                  : "Request one-time action"}
              </button>
            </article>
            <article>
              <span>3</span>
              <h2>Read only the receipt</h2>
              {receipt === undefined ? (
                <p className="muted">No completed exchange.</p>
              ) : (
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{receipt.status}</dd>
                  </div>
                  <div>
                    <dt>Model saw secret</dt>
                    <dd>no</dd>
                  </div>
                  <div>
                    <dt>DPoP token</dt>
                    <dd>
                      {receipt.protocol.accessTokenSenderConstrained
                        ? "bound"
                        : "failed"}
                    </dd>
                  </div>
                  <div>
                    <dt>Nonce retry</dt>
                    <dd>
                      {receipt.protocol.nonceRetryObserved
                        ? "verified"
                        : "failed"}
                    </dd>
                  </div>
                  <div>
                    <dt>PKCE S256</dt>
                    <dd>
                      {receipt.protocol.pkceS256Verified
                        ? "verified"
                        : "failed"}
                    </dd>
                  </div>
                </dl>
              )}
            </article>
          </section>

          <section className="boundary">
            <strong>Explicit compatibility mode: email bearer secret</strong>
            <span>
              This second flow uses the same exact-request passkey approval, but
              labels the six-digit email code honestly as a relayable bearer
              secret. A deterministic destination adapter submits it to one
              fixed HTTPS endpoint; neither agent receives the code or endpoint
              response.
            </span>
            <button
              disabled={running || !passkeyReady}
              onClick={runEmailExchange}
              type="button"
            >
              {running ? "Waiting for secure approval…" : "Run email-code mode"}
            </button>
            {emailReceipt === undefined ? null : (
              <span>
                Receipt: {emailReceipt.status}; model saw secret: no; assurance:{" "}
                {emailReceipt.assuranceMode}
              </span>
            )}
          </section>

          <section className="boundary">
            <strong>Standing mode: authorize an agent ahead of time</strong>
            <span>
              One passkey ceremony signs an exact, fifteen-minute mandate for
              this requester agent, recipient agent, mailbox, destination,
              purpose, secret kind, and at most three uses. Later executions do
              not need the owner online. The email code remains a bearer secret,
              so it stays inside the deterministic broker and destination tool.
            </span>
            {standingMandate === undefined ? (
              <button
                disabled={running || !passkeyReady}
                onClick={enrollStandingMandate}
                type="button"
              >
                {running
                  ? "Waiting for secure approval…"
                  : "Authorize standing agent access"}
              </button>
            ) : (
              <div>
                <span>
                  Mandate active · {standingMandate.usesRemaining} of{" "}
                  {standingMandate.maximumUses} uses remain
                </span>
                <button
                  disabled={running || standingMandate.usesRemaining === 0}
                  onClick={executeStandingMandate}
                  type="button"
                >
                  {running ? "Agent is executing…" : "Simulate agent request"}
                </button>
                <button
                  disabled={running}
                  onClick={revokeStandingMandate}
                  type="button"
                >
                  Revoke mandate
                </button>
              </div>
            )}
            {standingReceipt === undefined ? null : (
              <span>
                Receipt: {standingReceipt.status}; model saw secret: no;
                authorization: {standingReceipt.assuranceMode}
              </span>
            )}
          </section>

          {error === undefined ? null : (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <footer>
            Production deployments replace the in-memory stores, mock
            authorization server, and direct transport with durable adapters and
            a trusted token-confined broker. Provider capability gaps remain
            explicit.
          </footer>
        </main>
      </body>
    </html>
  );
};
