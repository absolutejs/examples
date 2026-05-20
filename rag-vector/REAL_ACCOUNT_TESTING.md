# Real Account Testing

This example already supports switching the existing sync tiles from fixture mode to live-account mode through environment variables. No UI changes are required. If the env vars are present, the same tiles switch to live mode automatically.

## Run Flow

1. Set the env vars for the provider you want to test.
2. Start the example:
   - `bun run corpus:generate`
   - `bun run dev:docker`
3. Open any framework page already in the navbar.
4. Go to `Knowledge Base Operations`.
5. Confirm the relevant tile shows:
   - `account mode: live`
   - a live target
   - a live-account status line
6. Click `Sync ...` or `Queue ...` on that tile.
7. Verify the synced source appears in retrieval, citations, grounding, and ops state.

## Supported Live Providers

### Gmail

Required env:

```env
RAG_GMAIL_ACCESS_TOKEN=...
```

Optional env:

```env
RAG_GMAIL_USER_ID=me
RAG_GMAIL_QUERY=in:inbox newer_than:30d
RAG_GMAIL_LABEL_IDS=INBOX
```

Expected UI result:
- `Gmail sync account`
- `account mode: live`
- target reflects the configured account/query

### Microsoft Graph

Required env:

```env
RAG_GRAPH_ACCESS_TOKEN=...
```

Optional env:

```env
RAG_GRAPH_BASE_URL=https://graph.microsoft.com/v1.0
RAG_GRAPH_USER_ID=me
RAG_GRAPH_FOLDER_ID=...
RAG_GRAPH_FILTER=...
RAG_GRAPH_SEARCH=refund
```

Expected UI result:
- `Graph sync account`
- `account mode: live`
- target reflects the configured account/folder/search

### IMAP

Required env:

```env
RAG_IMAP_HOST=imap.example.com
RAG_IMAP_USERNAME=you@example.com
RAG_IMAP_PASSWORD=...
```

Optional env:

```env
RAG_IMAP_PORT=993
RAG_IMAP_SECURE=true
RAG_IMAP_MAILBOX=INBOX
```

Expected UI result:
- `IMAP sync account`
- `account mode: live`
- target reflects the configured mailbox

### Storage (S3 / R2 / S3-compatible)

Required env:

```env
RAG_STORAGE_BUCKET=your-bucket
```

Common optional env:

```env
RAG_STORAGE_REGION=us-east-1
RAG_STORAGE_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
RAG_STORAGE_ACCESS_KEY_ID=...
RAG_STORAGE_SECRET_ACCESS_KEY=...
RAG_STORAGE_SESSION_TOKEN=...
RAG_STORAGE_PREFIX=releases/
RAG_STORAGE_KEYS=releases/a.md,releases/b.md
```

Expected UI result:
- `Storage sync account`
- `account mode: live`
- target reflects the configured bucket/prefix

## What To Verify After Sync

### Ops
- the sync source status moves out of `IDLE`
- `last successful sync` updates
- document/chunk counts update when appropriate
- scheduled/background behavior still works for the other sources

### Retrieval
- run a targeted query against the newly synced source
- confirm the retrieved chunk text matches the live source
- confirm the source label is traceable

### Grounding And Citations
- `Evidence Sources` should include the synced source
- `Grounding Reference Map` should show source-native context
- email-backed evidence should show message vs attachment provenance
- `Citation Trail` should show stable evidence labels and provenance lines

## Current Env Variable Surface

### Gmail
- `RAG_GMAIL_ACCESS_TOKEN`
- `RAG_GMAIL_USER_ID`
- `RAG_GMAIL_QUERY`
- `RAG_GMAIL_LABEL_IDS`

### Graph
- `RAG_GRAPH_ACCESS_TOKEN`
- `RAG_GRAPH_BASE_URL`
- `RAG_GRAPH_USER_ID`
- `RAG_GRAPH_FOLDER_ID`
- `RAG_GRAPH_FILTER`
- `RAG_GRAPH_SEARCH`

### IMAP
- `RAG_IMAP_HOST`
- `RAG_IMAP_PORT`
- `RAG_IMAP_SECURE`
- `RAG_IMAP_USERNAME`
- `RAG_IMAP_PASSWORD`
- `RAG_IMAP_MAILBOX`

### Storage
- `RAG_STORAGE_BUCKET`
- `RAG_STORAGE_REGION`
- `RAG_STORAGE_ENDPOINT`
- `RAG_STORAGE_ACCESS_KEY_ID`
- `RAG_STORAGE_SECRET_ACCESS_KEY`
- `RAG_STORAGE_SESSION_TOKEN`
- `RAG_STORAGE_PREFIX`
- `RAG_STORAGE_KEYS`

## Notes

- Leaving env vars unset keeps the example in fixture mode.
- The same pages and tiles are used for both fixture and live-account testing.
- This is intentional. The goal is to prove the real integrations without building a separate demo path.
