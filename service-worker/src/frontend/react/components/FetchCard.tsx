import { useCallback, useState } from "react";

type FetchResult = {
  url: string;
  source: string;
  status: number;
  duration: number;
};

const TEST_URLS = [
  "/assets/svg/react.svg",
  "/assets/png/absolutejs-temp.png",
  "/assets/ico/favicon.ico",
];

const CACHE_THRESHOLD_MS = 5;

const detectSource = (response: Response, duration: number) => {
  if (response.headers.get("x-sw-cache") === "true") return "cache";
  if (duration < CACHE_THRESHOLD_MS) return "cache (likely)";

  return "network";
};

const fetchUrl = async (url: string) => {
  const start = performance.now();
  try {
    const response = await fetch(url);
    const duration = Math.round(performance.now() - start);

    return {
      duration,
      source: detectSource(response, duration),
      status: response.status,
      url: url.split("/").pop() ?? url,
    };
  } catch {
    const duration = Math.round(performance.now() - start);

    return {
      duration,
      source: "error",
      status: 0,
      url: url.split("/").pop() ?? url,
    };
  }
};

export const FetchCard = ({ swReady }: { swReady: boolean }) => {
  const [fetching, setFetching] = useState(false);
  const [results, setResults] = useState<FetchResult[]>([]);

  const runFetchTest = useCallback(async () => {
    setFetching(true);
    setResults([]);
    const newResults = await Promise.all(TEST_URLS.map(fetchUrl));
    setResults(newResults);
    setFetching(false);
  }, []);

  return (
    <div className="sw-card">
      <div className="card-title">Fetch Intercept</div>
      <p className="card-desc">
        Fetch resources and see if they come from cache or network.
      </p>
      <button
        className={fetching ? "loading" : ""}
        disabled={!swReady || fetching}
        onClick={runFetchTest}
      >
        {fetching ? "Fetching" : "Test Fetch"}
      </button>
      {results.length > 0 && (
        <div className="sw-result">
          {results.map((result) => (
            <div className="result-row" key={result.url}>
              <span>{result.url}</span>
              <span>
                {result.status} {result.source} {result.duration}ms
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
