import { useCallback, useState } from "react";
import { PING_COUNT } from "../../constants";

type PingResult = { index: number; latency: number };

const MAX_PING_MS = 50;
const PING_DELAY_MS = 200;
const PERCENT = 100;

export const PingCard = ({ swReady }: { swReady: boolean }) => {
  const [pinging, setPinging] = useState(false);
  const [results, setResults] = useState<PingResult[]>([]);

  const runPing = useCallback(() => {
    const serviceWorker = navigator.serviceWorker?.controller;
    if (!serviceWorker) return;
    setPinging(true);
    setResults([]);
    let count = 0;

    const sendPing = () => {
      const start = performance.now();
      const handler = (event: MessageEvent) => {
        if (event.data.type !== "pong") return;

        const latency = Math.round(performance.now() - start);
        count++;
        setResults((prev) => [...prev, { index: count, latency }]);
        navigator.serviceWorker.removeEventListener("message", handler);
        if (count >= PING_COUNT) {
          setPinging(false);

          return;
        }
        setTimeout(sendPing, PING_DELAY_MS);
      };
      navigator.serviceWorker.addEventListener("message", handler);
      serviceWorker.postMessage({ type: "ping" });
    };

    sendPing();
  }, []);

  const avgLatency =
    results.length > 0
      ? Math.round(
          results.reduce((sum, result) => sum + result.latency, 0) /
            results.length,
        )
      : null;

  return (
    <div className="sw-card">
      <div className="card-title">Message Channel</div>
      <p className="card-desc">
        Ping the service worker and measure round-trip latency.
      </p>
      <button
        className={pinging ? "loading" : ""}
        disabled={!swReady || pinging}
        onClick={runPing}
      >
        {pinging
          ? `Pinging (${results.length}/${PING_COUNT})`
          : `Send ${PING_COUNT} Pings`}
      </button>
      {results.length > 0 && (
        <div className="ping-results">
          {results.map((result) => (
            <div className="ping-row" key={result.index}>
              <div className="ping-bar-track">
                <div
                  className="ping-bar-fill"
                  style={{
                    width: `${Math.min((result.latency / MAX_PING_MS) * PERCENT, PERCENT)}%`,
                  }}
                />
              </div>
              <span className="ping-label">{result.latency}ms</span>
            </div>
          ))}
        </div>
      )}
      <div className="sw-result">
        <div className="result-row">
          <span>Avg Latency</span>
          <span>{avgLatency !== null ? `${avgLatency}ms` : "\u2014"}</span>
        </div>
        <div className="result-row">
          <span>Pings</span>
          <span>
            {results.length} / {PING_COUNT}
          </span>
        </div>
      </div>
    </div>
  );
};
