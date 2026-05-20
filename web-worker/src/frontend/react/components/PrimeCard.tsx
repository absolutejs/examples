import { useCallback, useState } from "react";

type PrimeResult = { prime: number; n: number; duration: number };

export const PrimeCard = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrimeResult | null>(null);

  const runPrime = useCallback(() => {
    setLoading(true);
    const worker = new Worker(
      new URL("../../workers/prime.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<PrimeResult>) => {
      setResult(event.data);
      setLoading(false);
      worker.terminate();
    };
    worker.postMessage({ n: 10000 });
  }, []);

  return (
    <div className="worker-card">
      <div className="card-title">Prime Finder</div>
      <p className="card-desc">CPU-bound computation off the main thread.</p>
      <button
        className={loading ? "loading" : ""}
        disabled={loading}
        onClick={runPrime}
      >
        {loading ? "Computing" : "Find 10,000th Prime"}
      </button>
      <div className="worker-result">
        <div className="result-row">
          <span>Prime #10000</span>
          <span>{result ? result.prime.toLocaleString() : "\u2014"}</span>
        </div>
        <div className="result-row">
          <span>Duration</span>
          <span>{result ? `${result.duration}ms` : "\u2014"}</span>
        </div>
      </div>
    </div>
  );
};
