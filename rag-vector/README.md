# AbsoluteJS RAG Vector Example

This demo is pinned to `@absolutejs/absolute@0.19.0-beta.644 + @absolutejs/ai@0.0.2 + @absolutejs/rag@0.0.1`.

This example now demonstrates four backend modes in one repo:

- `sqlite-native`
  - packaged SQLite `vec0`
  - mode shows as `native_vec0`
- `sqlite-fallback`
  - owned JSON fallback path
  - mode shows as `json_fallback`
- `postgres`
  - PostgreSQL + `pgvector`
  - mode shows as `native_pgvector`
- `pinecone`
  - managed Pinecone vector index
  - reports as `custom` (Pinecone is not in the closed `RAGVectorStoreStatus` backend union)

The frontend stays the same across all six framework pages. The `Backend mode`
selector swaps the page between explicit backend routes, so the diagnostics and retrieval
results always come from the selected backend.

Every framework page is intended to stay in parity:

- retrieval and source inspection
- diagnostics and ops health
- release control
- quality/evaluation views
- document inspection and chunk previews

There is no separate smoke-only demo surface that carries features the pages do not.

It also exercises the newer public RAG package surfaces from the published beta:

- `@absolutejs/rag`
- `@absolutejs/rag/ui`

## Run It

### SQLite only

This gives you:
- `sqlite-native`
- `sqlite-fallback`

```bash
cd ~/alex/absolutejs-rag-vector-example
bun dev
```

### SQLite + PostgreSQL

Start the local pgvector container (safe to rerun):

```bash
cd ~/alex/absolutejs-rag-vector-example
bun run pg:start
```

Then run the example with PostgreSQL enabled:

```bash
bun run dev:docker
```

Stop the local pgvector container when you are done:

```bash
bun run pg:stop
```

If you want container logs:

```bash
bun run pg:logs
```

## Use a Hosted PostgreSQL Database

Docker is only the default local test path.

You can also point the example at a real PostgreSQL database:

```bash
cd ~/alex/absolutejs-rag-vector-example
RAG_POSTGRES_URL='postgresql://USER:PASS@HOST:PORT/DBNAME?sslmode=require' bun dev
```

Requirements:
- PostgreSQL
- `pgvector` extension available
- permission to create the extension, or it already enabled

## Use Pinecone

The Pinecone backend is enabled when both `PINECONE_API_KEY` and
`PINECONE_INDEX_NAME` are set. The package
(`@absolutejs/absolute-rag-pinecone`) does not auto-provision indexes — create
the index in the Pinecone console first.

### Create the index

In the Pinecone console (https://app.pinecone.io):

- **Name**: anything (this becomes `PINECONE_INDEX_NAME`)
- **Dimensions**: `1024` to match the demo's deterministic hash embedder default
  (override with `PINECONE_DIMENSIONS=<n>` if you create the index at a
  different dimension; the embedder generates whatever size you ask for)
- **Metric**: `cosine`
- **Capacity mode**: serverless is sufficient

### Environment variables

| Variable                  | Required | Notes                                                        |
| ------------------------- | -------- | ------------------------------------------------------------ |
| `PINECONE_API_KEY`        | yes      | Account API key from the Pinecone console.                   |
| `PINECONE_INDEX_NAME`     | yes      | Name of the index you created.                               |
| `PINECONE_NAMESPACE`      | no       | Logical partition inside the index (default: empty).         |
| `PINECONE_DIMENSIONS`     | no       | Defaults to `1024`. Must match the index's configured dim.   |

### Run

```bash
cd ~/alex/absolutejs-rag-vector-example
PINECONE_API_KEY=... PINECONE_INDEX_NAME=absolute-rag-demo bun dev
```

Pinecone runs alongside the SQLite/Postgres backends — they don't conflict.
Each backend has its own `/rag/<mode>/...` route family and its own seeded
chunks at startup.

## How To Test

Open any page:

- `http://localhost:3000/react`
- `http://localhost:3000/svelte`
- `http://localhost:3000/vue`
- `http://localhost:3000/angular`
- `http://localhost:3000/html`
- `http://localhost:3000/htmx`

In the `Diagnostics` card:

1. Select `SQLite Native`
2. Confirm:
   - backend: `sqlite`
   - mode: `native_vec0`

3. Select `SQLite Fallback`
4. Confirm:
   - backend: `sqlite`
   - mode: `json_fallback`

5. If PostgreSQL is enabled, select `PostgreSQL`
6. Confirm:
   - backend: `postgres`
   - mode: `native_pgvector`

Then in all modes:

1. Add a document with a unique phrase like `glacier-fox-9182`
2. Search for that phrase
3. Confirm:
   - the result text contains the phrase
   - the source label matches the indexed document

## Direct API Checks

Default selected mode:

```bash
curl -s http://localhost:3000/rag/status
```

Force fallback:

```bash
curl -s 'http://localhost:3000/rag/status?mode=sqlite-fallback'
```

Force PostgreSQL:

```bash
curl -s 'http://localhost:3000/rag/status?mode=postgres'
```

Run a search:

```bash
curl -s -X POST 'http://localhost:3000/rag/search?mode=postgres' \
  -H 'Content-Type: application/json' \
  -d '{"query":"metadata filters","topK":2}'
```

## Notes

- `sqlite-native` uses `@absolutejs/absolute-rag-sqlite`
- `postgres` uses `@absolutejs/absolute-rag-postgresql`
- PostgreSQL is optional; the example still works without it
- Windows arm64 support is still limited on the SQLite native line because upstream `sqlite-vec` does not currently ship that target
