import { useCallback, useState } from "react";

type SortResult = {
  size: number;
  min: number;
  max: number;
  median: number;
  duration: number;
};

export const SortCard = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SortResult | null>(null);

  const runSort = useCallback(() => {
    setLoading(true);
    const worker = new Worker(
      new URL("../../workers/sort.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<SortResult>) => {
      setResult(event.data);
      setLoading(false);
      worker.terminate();
    };
    worker.postMessage({ size: 1000000 });
  }, []);

  return (
    <div className="worker-card">
      <div className="card-title">Sort Array</div>
      <p className="card-desc">Data processing without blocking the UI.</p>
      <button
        className={loading ? "loading" : ""}
        disabled={loading}
        onClick={runSort}
      >
        {loading ? "Sorting" : "Sort 1M Numbers"}
      </button>
      <div className="worker-result">
        <div className="result-row">
          <span>Min</span>
          <span>{result ? result.min.toLocaleString() : "\u2014"}</span>
        </div>
        <div className="result-row">
          <span>Max</span>
          <span>{result ? result.max.toLocaleString() : "\u2014"}</span>
        </div>
        <div className="result-row">
          <span>Median</span>
          <span>{result ? result.median.toLocaleString() : "\u2014"}</span>
        </div>
        <div className="result-row">
          <span>Duration</span>
          <span>{result ? `${result.duration}ms` : "\u2014"}</span>
        </div>
      </div>
    </div>
  );
};
