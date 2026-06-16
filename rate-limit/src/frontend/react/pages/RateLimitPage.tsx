import { useState } from "react";
import { Head } from "@absolutejs/absolute/react/components";

type RateLimitPageProps = {
  cssPath?: string;
};

type LogEntry = {
  id: number;
  route: string;
  status: number;
  remaining: string | null;
  limit: string | null;
  policy: string | null;
  retryAfter: string | null;
  at: number;
};

let counter = 0;

const readLimitHeaders = (response: Response) => {
  const combined = response.headers.get("RateLimit");
  if (combined) {
    const parts = Object.fromEntries(
      combined.split(",").map((piece) => {
        const [name, value] = piece.trim().split("=");
        return [name ?? "", value ?? ""];
      }),
    );
    return {
      limit: parts.limit ?? null,
      policy: response.headers.get("RateLimit-Policy"),
      remaining: parts.remaining ?? null,
    };
  }
  return {
    limit: null,
    policy: null,
    remaining: null,
  };
};

export const RateLimitPage = ({ cssPath }: RateLimitPageProps) => {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [adminMode, setAdminMode] = useState(false);

  const send = async (route: string) => {
    const headers: Record<string, string> = {};
    if (adminMode) headers.Authorization = "Bearer demo-admin-token";
    const response = await fetch(route, { headers });
    const { limit, remaining, policy } = readLimitHeaders(response);
    counter += 1;
    const entry: LogEntry = {
      at: Date.now(),
      id: counter,
      limit,
      policy,
      remaining,
      retryAfter: response.headers.get("Retry-After"),
      route,
      status: response.status,
    };
    setLog((current) => [entry, ...current].slice(0, 100));
  };

  const burst = async (route: string, n: number) => {
    for (let i = 0; i < n; i++) await send(route);
  };

  return (
    <>
      <Head cssPath={cssPath} title="@absolutejs/rate-limit" />
      <main>
        <header>
          <h1>@absolutejs/rate-limit</h1>
          <p className="lead">
            GCRA by default, IETF RateLimit headers, IPv6 /64 grouping,
            X-Forwarded-For trust modes. Hit the routes below and watch the
            `RateLimit-Remaining` header count down — over the cap and the
            server returns 429 with `Retry-After`.
          </p>
        </header>

        <section>
          <h2>Global IP gate — GCRA 10 req/s with burst 5</h2>
          <p className="lead">
            `/api/info` costs 1; `/api/upload` costs 5 (route-weighted cost).
          </p>
          <div className="controls">
            <button onClick={() => send("/api/info")} data-testid="info-1">
              GET /api/info (cost 1)
            </button>
            <button onClick={() => burst("/api/info", 10)} data-testid="info-10">
              Burst 10
            </button>
            <button onClick={() => send("/api/upload")} data-testid="upload-1">
              GET /api/upload (cost 5)
            </button>
            <button onClick={() => burst("/api/upload", 3)} data-testid="upload-3">
              Burst 3
            </button>
          </div>
          <label className="row">
            <input
              type="checkbox"
              checked={adminMode}
              onChange={(event) => setAdminMode(event.target.checked)}
              data-testid="admin-toggle"
            />
            Admin mode (skip the limit entirely)
          </label>
        </section>

        <section>
          <h2>Decision log</h2>
          <p className="lead">Most-recent request at the top.</p>
          <div className="log" data-testid="log">
            {log.length === 0 && <em>No requests yet.</em>}
            {log.map((entry) => (
              <div className="log-row" key={entry.id}>
                <span
                  className={
                    entry.status === 429 ? "status-429" : "status-200"
                  }
                >
                  {entry.status}
                </span>
                <span>{entry.route}</span>
                <span>
                  limit={entry.limit ?? "—"} remaining=
                  {entry.remaining ?? "—"}
                  {entry.retryAfter && ` retryAfter=${entry.retryAfter}s`}
                  {entry.policy && ` policy=${entry.policy}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
};
