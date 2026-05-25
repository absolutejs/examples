import { useState, type FormEvent } from "react";
import { useSyncCollection } from "@absolutejs/sync/react";

// A live retrieval hit from the sync-backed RAG store (tagged with _score).
type RagHit = {
  chunkId: string;
  chunkText: string;
  title?: string;
  _score?: number;
};

// The web proxies /rag/:mode WebSockets to the rag service, so the sync engine's
// retrieval socket (mounted at /rag/synclive on the rag service) is reachable
// same-origin from the browser.
const wsUrl = () => {
  if (typeof window === "undefined") {
    return "ws://localhost/rag/synclive";
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";

  return `${protocol}://${window.location.host}/rag/synclive`;
};

const RagHitItem = ({ hit }: { hit: RagHit }) => (
  <li className="demo-result-item">
    <span>
      {hit.title ? `${hit.title}: ` : ""}
      {hit.chunkText}
    </span>
  </li>
);

export const ReactSyncLiveRetrieval = () => {
  const [query, setQuery] = useState("");
  const [document, setDocument] = useState("");
  const hits = useSyncCollection<RagHit>({
    collection: "ragRetrieval",
    params: query,
    url: wsUrl(),
    key: (hit) => hit.chunkId,
  });
  const results = [...hits.data].sort(
    (first, second) => (second._score ?? 0) - (first._score ?? 0),
  );

  const ingest = (event: FormEvent) => {
    event.preventDefault();
    const text = document.trim();
    if (!text) {
      return;
    }
    setDocument("");
    void fetch("/rag/synclive/ingest", {
      body: JSON.stringify({ text }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  };

  return (
    <section className="demo-card" data-testid="sync-live-retrieval">
      <span className="demo-hero-kicker">Sync — live retrieval</span>
      <p className="demo-metadata">
        Subscribe with a query; results re-rank live as documents are ingested
        over the sync socket — no refetch, no vector DB.
      </p>
      <form onSubmit={(event) => event.preventDefault()}>
        <input
          aria-label="Live retrieval query"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask the corpus…"
          value={query}
        />
      </form>
      <form onSubmit={ingest}>
        <input
          aria-label="Ingest document (sync)"
          onChange={(event) => setDocument(event.target.value)}
          placeholder="Ingest a document…"
          value={document}
        />
        <button type="submit">Ingest</button>
      </form>
      {query.trim().length > 0 && (
        <ul data-testid="sync-live-results">
          {results.map((hit) => (
            <RagHitItem hit={hit} key={hit.chunkId} />
          ))}
          {results.length === 0 && (
            <li className="demo-metadata">No matches.</li>
          )}
        </ul>
      )}
    </section>
  );
};
