import { useCallback, useState } from "react";
import { HASH_PREVIEW_LENGTH } from "../../constants";

type HashResult = { hash: string; input: string };

export const HashCard = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HashResult | null>(null);

  const runHash = useCallback(() => {
    setLoading(true);
    const worker = new Worker(
      new URL("../../workers/hash.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<HashResult>) => {
      setResult(event.data);
      setLoading(false);
      worker.terminate();
    };
    worker.postMessage({ text: "Hello, World!" });
  }, []);

  return (
    <div className="worker-card">
      <div className="card-title">SHA-256 Hash</div>
      <p className="card-desc">
        Offload cryptographic hashing to a worker thread.
      </p>
      <button
        className={loading ? "loading" : ""}
        disabled={loading}
        onClick={runHash}
      >
        {loading ? "Computing" : "Compute Hash"}
      </button>
      <div className="worker-result">
        <div className="result-row">
          <span>Input</span>
          <span>{result ? result.input : "\u2014"}</span>
        </div>
        <div className="result-row">
          <span>Hash</span>
          <span>
            {result
              ? `${result.hash.slice(0, HASH_PREVIEW_LENGTH)}...`
              : "\u2014"}
          </span>
        </div>
      </div>
    </div>
  );
};
