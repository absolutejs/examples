import { useCallback, useState } from "react";

type OfflineResult = {
  url: string;
  ok: boolean;
  status: number;
};

const CACHED_URL = "/assets/png/absolutejs-temp.png";

const testUrl = async (url: string) => {
  try {
    const response = await fetch(url);

    return {
      ok: response.ok,
      status: response.status,
      url: url.split("/").pop() ?? url,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      url: url.split("/").pop() ?? url,
    };
  }
};

export const OfflineCard = ({ swReady }: { swReady: boolean }) => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<OfflineResult[]>([]);
  const [online, setOnline] = useState(navigator.onLine);

  const testOffline = useCallback(async () => {
    setTesting(true);
    setOnline(navigator.onLine);

    const uncachedUrl = `/assets/svg/react.svg?nocache=${Date.now()}`;
    const newResults = await Promise.all(
      [CACHED_URL, uncachedUrl].map(testUrl),
    );

    setResults(newResults);
    setTesting(false);
  }, []);

  return (
    <div className="sw-card">
      <div className="card-title">Offline Test</div>
      <p className="card-desc">
        Test cached vs uncached resources when offline.
      </p>
      <div className={`status-badge ${online ? "active" : "inactive"}`}>
        <span className="dot" />
        {online ? "Online" : "Offline"}
      </div>
      <button
        className={testing ? "loading" : ""}
        disabled={!swReady || testing}
        onClick={testOffline}
      >
        {testing ? "Testing" : "Test Resources"}
      </button>
      {results.length > 0 && (
        <div className="sw-result">
          {results.map((result) => (
            <div className="result-row" key={result.url}>
              <span>{result.url}</span>
              <span>
                {result.ok
                  ? `OK (${result.status})`
                  : `FAIL (${result.status})`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
