import { useEffect, useState } from "react";
import { createSyncSubscriber } from "@absolutejs/sync/client";

const COUNTER_TOPIC = "counter";

export const SyncReactContent = () => {
  const [count, setCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/state")
      .then((response) => response.json())
      .then((data: { count: number }) => {
        if (active) {
          setCount(data.count);
        }
      });

    // One SSE subscription replaces polling: the server pushes the new value to
    // every connected client the instant anyone bumps it.
    const subscriber = createSyncSubscriber({
      onError: () => setConnected(false),
      onEvent: (event) => {
        const payload = event.payload as { count?: number } | undefined;
        if (payload?.count !== undefined) {
          setCount(payload.count);
        }
      },
      onOpen: () => setConnected(true),
      topics: [COUNTER_TOPIC],
      url: "/sync",
    });

    return () => {
      active = false;
      subscriber.close();
    };
  }, []);

  const bump = () => {
    void fetch("/api/bump", { method: "POST" });
  };
  const reset = () => {
    void fetch("/api/reset", { method: "POST" });
  };

  return (
    <main>
      <div className="page-title">
        <img alt="React" src="/assets/svg/react.svg" />
        <h1>React</h1>
        <span className="badge">@absolutejs/sync</span>
      </div>

      <p className="section-desc">
        This counter lives on the server. Each page subscribes to the{" "}
        <code>counter</code> topic over a single Server-Sent Events stream and
        re-renders the moment the value changes — no polling, no refresh.
      </p>

      <section className="sync-card">
        <div className="sync-status">
          <span className={connected ? "dot dot-live" : "dot"} />
          {connected ? "Live — subscribed to /sync" : "Connecting…"}
        </div>
        <div className="sync-count">{count}</div>
        <div className="sync-actions">
          <button className="primary" onClick={bump} type="button">
            Bump counter
          </button>
          <button onClick={reset} type="button">
            Reset
          </button>
        </div>
      </section>

      <p className="section-desc">
        Open <code>/vue</code>, <code>/svelte</code>, <code>/angular</code>,{" "}
        <code>/html</code>, or <code>/htmx</code> in another tab and bump from
        any of them — every open client updates at once.
      </p>

      <p className="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by{" "}
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          AbsoluteJS
        </a>
      </p>
    </main>
  );
};
