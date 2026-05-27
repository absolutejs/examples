// Self-service session management via the useSessions composable from
// @absolutejs/auth/react. Lists the signed-in user's active sessions and revokes
// any one of them remotely. The composable handles fetch + cache + refetch-on-revoke.

import { useSessions } from "@absolutejs/auth/react";
import { authClient } from "../../shared/authClient";

type SessionRow = {
  createdAt?: number;
  current?: boolean;
  expiresAt?: number;
  id: string;
  ip?: string;
  userAgent?: string;
};

const isSessionRow = (value: unknown): value is SessionRow => {
  if (typeof value !== "object" || value === null) return false;
  const candidate: { id?: unknown } = { ...value };

  return typeof candidate.id === "string";
};

const SessionCard = ({
  onRevoke,
  session,
}: {
  onRevoke: (id: string) => void;
  session: SessionRow;
}) => (
  <li className="showcase-card--lg">
    <div className="showcase-monospace">{session.id}</div>
    {typeof session.userAgent === "string" && (
      <div className="muted">{session.userAgent}</div>
    )}
    {typeof session.ip === "string" && (
      <div className="muted">IP: {session.ip}</div>
    )}
    <button
      className="button"
      onClick={() => onRevoke(session.id)}
      type="button"
    >
      Revoke
    </button>
  </li>
);

export const SessionsShowcase = () => {
  const { data, error, isPending, refetch, revoke } = useSessions(authClient);
  const sessions: SessionRow[] = Array.isArray(data)
    ? data.filter(isSessionRow)
    : [];

  return (
    <section className="auth-section stack">
      <div>
        <h1 className="page-heading">Sessions</h1>
        <p className="muted">
          Every active session for the signed-in user. Revoke any device
          remotely; the affected client&apos;s next request returns 401.
        </p>
      </div>

      <div className="stack">
        <button
          className="button"
          onClick={() => void refetch()}
          type="button"
        >
          Refresh
        </button>
        {isPending && <p className="muted">Loading…</p>}
        {error !== null && (
          <p className="auth-error" role="alert">
            {error.message}
          </p>
        )}
        {!isPending && sessions.length === 0 && (
          <p className="muted">
            No active sessions returned (you may not be signed in).
          </p>
        )}
        <ul className="stack">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              onRevoke={(id) => void revoke(id)}
              session={session}
            />
          ))}
        </ul>
      </div>
    </section>
  );
};
