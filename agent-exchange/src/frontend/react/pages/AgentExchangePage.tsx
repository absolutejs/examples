import { Head } from "@absolutejs/absolute/react/components";
import { useState } from "react";

type AgentExchangePageProps = { readonly cssPath?: string };

type DemoResult = {
  readonly attacks: {
    readonly purposeSubstitution: "rejected";
    readonly replay: "rejected";
  };
  readonly mailboxReads: number;
  readonly modelObservedSecret: false;
  readonly receipt: {
    readonly exchangeId: string;
    readonly maximumUses: 1;
    readonly status: "submitted";
  };
  readonly secretPersisted: false;
  readonly steps: readonly {
    readonly detail: string;
    readonly name: string;
    readonly status: "passed";
  }[];
  readonly submissions: number;
};

export const AgentExchangePage = ({ cssPath }: AgentExchangePageProps) => {
  const [result, setResult] = useState<DemoResult>();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();

  const run = async () => {
    setRunning(true);
    setError(undefined);
    try {
      const response = await fetch("/api/agent-exchange/run", {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Demo failed with ${response.status}.`);
      setResult((await response.json()) as DemoResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Demo failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Head cssPath={cssPath} title="Secure Agent Exchange" />
      <main>
        <header>
          <span className="eyebrow">@absolutejs/agent-exchange</span>
          <h1>Let the tools use the code. Keep it away from both models.</h1>
          <p className="lead">
            A passkey-enrolled standing mandate authorizes one requesting agent,
            one recipient agent, one mailbox, one challenge, and one purpose.
          </p>
          <button disabled={running} onClick={run} data-testid="run-exchange">
            {running ? "Running cryptographic flow…" : "Run secure exchange"}
          </button>
          {error && <p className="error">{error}</p>}
        </header>

        <section className="boundary">
          <div>
            <strong>Request</strong>
            <span>Signed + purpose-bound</span>
          </div>
          <i>→</i>
          <div>
            <strong>Email broker</strong>
            <span>Model-blind</span>
          </div>
          <i>→</i>
          <div>
            <strong>HPKE envelope</strong>
            <span>Recipient-bound</span>
          </div>
          <i>→</i>
          <div>
            <strong>Submit tool</strong>
            <span>Single use</span>
          </div>
        </section>

        <section>
          <h2>Evidence, never the secret</h2>
          {!result && (
            <p className="muted">
              Run the flow to generate a redacted receipt.
            </p>
          )}
          {result && (
            <div className="steps" data-testid="steps">
              {result.steps.map((step) => (
                <article key={step.name}>
                  <span className="check">✓</span>
                  <div>
                    <strong>{step.name}</strong>
                    <p>{step.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {result && (
          <section className="facts" data-testid="safe-result">
            <div>
              <span>Mailbox reads</span>
              <strong>{result.mailboxReads}</strong>
            </div>
            <div>
              <span>Submissions</span>
              <strong>{result.submissions}</strong>
            </div>
            <div>
              <span>Purpose substitution</span>
              <strong>{result.attacks.purposeSubstitution}</strong>
            </div>
            <div>
              <span>Replay</span>
              <strong>{result.attacks.replay}</strong>
            </div>
            <div>
              <span>Model observed secret</span>
              <strong>{String(result.modelObservedSecret)}</strong>
            </div>
            <div>
              <span>Secret persisted</span>
              <strong>{String(result.secretPersisted)}</strong>
            </div>
          </section>
        )}

        <footer>
          Email OTPs are still bearer credentials. The phishing-resistant part
          is the exact authorization and execution ceremony around them.
        </footer>
      </main>
    </>
  );
};
