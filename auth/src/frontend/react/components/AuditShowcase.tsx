// Tamper-evident audit log via the showcase admin endpoint /api/audit/events.
// The backend wraps the Neon audit sink in createTamperEvidentSink: every event is
// hash-chained, and verifyAuditChain returns a per-writer integrity report.

import { useEffect, useState } from "react";

type AuditEvent = {
  at: number;
  ip?: string;
  metadata?: Record<string, unknown>;
  type: string;
  userId?: string;
};

type ChainVerification = {
  brokenAt?: number;
  ok: boolean;
  writerId?: string;
}[];

type AuditPayload = {
  events: AuditEvent[];
  verification: ChainVerification;
};

const fetchAuditPayload = async () => {
  const response = await fetch("/api/audit/events");
  if (!response.ok) {
    const text = (await response.text()).replace(/^"|"$/g, "");
    throw new Error(text || response.statusText);
  }
  const body: AuditPayload = await response.json();

  return body;
};

const IntegrityRow = ({ check }: { check: ChainVerification[number] }) => (
  <li className={check.ok ? "muted" : "auth-error"}>
    writer={check.writerId ?? "—"} ok={String(check.ok)}
    {check.brokenAt !== undefined &&
      ` brokenAt=${new Date(check.brokenAt).toISOString()}`}
  </li>
);

const EventCard = ({ event }: { event: AuditEvent }) => (
  <li className="showcase-card">
    <div>
      <strong>{event.type}</strong>{" "}
      <span className="muted">{new Date(event.at).toISOString()}</span>
    </div>
    {event.userId !== undefined && (
      <div className="muted">user: {event.userId}</div>
    )}
    {event.ip !== undefined && <div className="muted">ip: {event.ip}</div>}
  </li>
);

export const AuditShowcase = () => {
  const [data, setData] = useState<AuditPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fetchEvents = async () => {
    setPending(true);
    setError(null);
    try {
      setData(await fetchAuditPayload());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load");
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, []);

  return (
    <section className="auth-section stack">
      <div>
        <h1 className="page-heading">Audit log integrity</h1>
        <p className="muted">
          Every event emitted by <code>@absolutejs/auth</code> is captured by
          the tamper-evident sink (<code>createTamperEvidentSink</code> wraps
          the Neon sink) and hash-chained per writer.{" "}
          <code>verifyAuditChain</code> reports any break.
        </p>
      </div>

      <div className="stack">
        <button
          className="button"
          disabled={pending}
          onClick={() => void fetchEvents()}
          type="button"
        >
          {pending ? "Loading…" : "Refresh"}
        </button>

        {error !== null && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        {data !== null && (
          <>
            <h2>Integrity</h2>
            <ul className="showcase-monospace">
              {data.verification.map((check) => (
                <IntegrityRow check={check} key={check.writerId ?? "default"} />
              ))}
            </ul>

            <h2>Recent events ({data.events.length})</h2>
            <ul className="stack">
              {data.events.map((event) => (
                <EventCard
                  event={event}
                  key={`${event.at}-${event.type}-${event.userId ?? "anon"}`}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
};
