import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSyncCollection } from "@absolutejs/sync/react";
import {
  createPresence,
  indexedDbCollectionCache,
  type PresenceClient,
  type PresenceMember,
} from "@absolutejs/sync/client";
import {
  createTextCrdt,
  type TextCrdt,
  type TextState,
} from "@absolutejs/sync/crdt";

type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

// A search hit is a task plus the relevance score the engine tags it with.
type TaskHit = Task & { _score?: number };

// The row a server-side scheduled function ticks once a second.
type Pulse = { id: string; count: number; at: number };

// A live RAG retrieval hit (from @absolutejs/rag's sync-backed store).
type RagHit = {
  chunkId: string;
  chunkText: string;
  title?: string;
  _score?: number;
};

// The shared collaborative document: a row whose `state` is a text-CRDT value.
type DocRow = { id: string; state: TextState };

type Presence = { name: string; typing: boolean };

type TaskItemProps = {
  task: Task;
  onToggle: (task: Task) => void;
  onRemove: (task: Task) => void;
};

const TaskItem = ({ task, onToggle, onRemove }: TaskItemProps) => (
  <li className={task.done ? "task-item done" : "task-item"}>
    <label>
      <input
        checked={task.done}
        onChange={() => onToggle(task)}
        type="checkbox"
      />
      <span>{task.title}</span>
    </label>
    <button
      aria-label="Remove"
      className="task-remove"
      onClick={() => onRemove(task)}
      type="button"
    >
      ×
    </button>
  </li>
);

// Connect read-only when the page URL carries ?role=viewer — the server enforces
// it (declarative write permission), so a viewer's writes are rejected.
const roleParam = () =>
  typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("role");

const SearchResultItem = ({ task }: { task: TaskHit }) => (
  <li className="task-item">
    <span>{task.title}</span>
  </li>
);

const RagHitItem = ({ hit }: { hit: RagHit }) => (
  <li className="task-item">
    <span>
      {hit.title ? `${hit.title}: ` : ""}
      {hit.chunkText}
    </span>
  </li>
);

const wsUrl = () => {
  if (typeof window === "undefined") {
    return "ws://localhost/sync/ws";
  }
  const role = roleParam();
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const query = role ? `?role=${encodeURIComponent(role)}` : "";

  return `${protocol}://${window.location.host}/sync/ws${query}`;
};

const randomName = () => `User-${globalThis.crypto.randomUUID().split("-")[0]}`;

// Local-first: persist confirmed rows in IndexedDB so the list is instant on
// reload and available offline. The socket resumes from the cached version.
const taskCache = indexedDbCollectionCache<Task>({ key: "tasks" });

// Ephemeral presence for the shared "tasks" room: who's online + who's typing.
const usePresence = (room: string) => {
  const [members, setMembers] = useState<PresenceMember<Presence>[]>([]);
  const [selfId, setSelfId] = useState<string>();
  const clientRef = useRef<PresenceClient<Presence> | null>(null);
  const nameRef = useRef(randomName());

  useEffect(() => {
    const presence = createPresence<Presence>({
      room,
      state: { name: nameRef.current, typing: false },
      url: wsUrl(),
    });
    clientRef.current = presence;
    setSelfId(presence.id);
    const unsubscribe = presence.subscribe(setMembers);

    return () => {
      unsubscribe();
      presence.close();
      clientRef.current = null;
    };
  }, [room]);

  const setTyping = (typing: boolean) =>
    clientRef.current?.set({ name: nameRef.current, typing });

  return { members, selfId, setTyping };
};

export const SyncReactContent = () => {
  const { data, status, mutate } = useSyncCollection<Task>({
    cache: taskCache,
    collection: "tasks",
    url: wsUrl(),
  });
  const { members, selfId, setTyping } = usePresence("tasks");
  const [title, setTitle] = useState("");
  // Live full-text search: a separate collection whose params are the query
  // string; the engine streams back the ranked top-K (each row tagged _score).
  const [search, setSearch] = useState("");
  const searchHits = useSyncCollection<TaskHit>({
    collection: "taskSearch",
    params: search,
    url: wsUrl(),
  });
  const results = [...searchHits.data].sort(
    (first, second) => (second._score ?? 0) - (first._score ?? 0),
  );
  // A scheduled (cron) function on the server ticks this row live — no polling.
  const pulse = useSyncCollection<Pulse>({
    collection: "pulse",
    url: wsUrl(),
  });
  const [serverPulse] = pulse.data;
  // Live RAG retrieval via @absolutejs/rag's sync-backed store: the query is the
  // params; results re-rank live as documents are ingested. (Keyed by chunkId.)
  const [ragQuery, setRagQuery] = useState("");
  const [ragDoc, setRagDoc] = useState("");
  const ragHits = useSyncCollection<RagHit>({
    collection: "ragRetrieval",
    params: ragQuery,
    url: wsUrl(),
    key: (hit) => hit.chunkId,
  });
  const ragResults = [...ragHits.data].sort(
    (first, second) => (second._score ?? 0) - (first._score ?? 0),
  );
  const ingestDoc = (event: FormEvent) => {
    event.preventDefault();
    const text = ragDoc.trim();
    if (!text) {
      return;
    }
    setRagDoc("");
    void ragHits.mutate({ args: { text }, name: "ingestDoc" });
  };
  // Conflict-free collaborative editing: a per-tab CRDT replica edits one shared
  // document. Local edits go to the engine as merged state; the engine merges
  // them into the stored state and pushes the result back, so concurrent edits
  // from other tabs converge here without clobbering (and without a round-trip
  // per keystroke — we hold the live text locally).
  const replicaRef = useRef(globalThis.crypto.randomUUID());
  const docCrdtRef = useRef<TextCrdt | null>(null);
  if (docCrdtRef.current === null) {
    docCrdtRef.current = createTextCrdt(replicaRef.current);
  }
  const [docText, setDocText] = useState("");
  const docCollection = useSyncCollection<DocRow>({
    collection: "doc",
    url: wsUrl(),
  });
  const sharedDoc = docCollection.data.find((row) => row.id === "shared");
  const sharedState = sharedDoc?.state;
  useEffect(() => {
    const crdt = docCrdtRef.current;
    if (!crdt || !sharedState) {
      return;
    }
    // Merge remote state into our replica (idempotent for our own echoes), then
    // show the merged text — both tabs' edits are present.
    crdt.merge(sharedState);
    const merged = crdt.text();
    setDocText((previous) => (previous === merged ? previous : merged));
  }, [sharedState]);

  const editDoc = (value: string) => {
    const crdt = docCrdtRef.current;
    if (!crdt) {
      return;
    }
    crdt.setText(value);
    setDocText(value);
    void docCollection.mutate({
      args: { id: "shared", state: crdt.state() },
      name: "editDoc",
    });
  };

  // Read role after mount (avoids an SSR/hydration mismatch on the badge).
  const [viewer, setViewer] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    setViewer(roleParam() === "viewer");
  }, []);

  useEffect(() => {
    setTyping(title.trim().length > 0);
  }, [title]);

  // Run a mutation, surfacing a server permission rejection instead of letting
  // the promise go unhandled (the optimistic change rolls back automatically).
  const submit = (options: Parameters<typeof mutate>[0]) => {
    setDenied(false);
    void mutate(options).catch(() => setDenied(true));
  };

  const tasks = [...data].sort(
    (first, second) => first.createdAt - second.createdAt,
  );
  const doneCount = tasks.filter((task) => task.done).length;
  const typing = members
    .filter((member) => member.id !== selfId && member.state.typing)
    .map((member) => member.state.name);

  const add = (event: FormEvent) => {
    event.preventDefault();
    const value = title.trim();
    if (!value) {
      return;
    }
    setTitle("");
    // Mint the id client-side so the optimistic row and the server-confirmed
    // row are the same node (no swap, no flicker).
    const id = globalThis.crypto.randomUUID();
    submit({
      args: { id, title: value },
      name: "addTask",
      optimistic: (draft) =>
        draft.set({ createdAt: Date.now(), done: false, id, title: value }),
    });
  };

  const toggle = (task: Task) =>
    submit({
      args: { id: task.id },
      name: "toggleTask",
      optimistic: (draft) => draft.set({ ...task, done: !task.done }),
    });

  const remove = (task: Task) =>
    submit({
      args: { id: task.id },
      name: "removeTask",
      optimistic: (draft) => draft.delete(task.id),
    });

  return (
    <main>
      <div className="page-title">
        <img alt="React" src="/assets/svg/react.svg" />
        <h1>React</h1>
        <span className="badge">@absolutejs/sync</span>
      </div>

      <p className="section-desc">
        A reactive query from the sync engine over a WebSocket: writes are
        transactional and go live automatically (read-set tracking), edits are
        optimistic, and presence shows who else is here — open another tab. Rows
        are cached in IndexedDB, so they're instant on reload and survive
        offline (the socket resumes from the cached version).
      </p>

      <p className="section-desc" data-testid="server-pulse">
        Server pulse #{serverPulse?.count ?? 0}
        {serverPulse
          ? ` · ${new Date(serverPulse.at).toLocaleTimeString()}`
          : ""}{" "}
        — a scheduled cron function on the server, pushed live (no polling).
      </p>

      <section className="sync-card">
        <div className="sync-bar">
          <div className="sync-status">
            <span className={status === "ready" ? "dot dot-live" : "dot"} />
            {status === "ready" ? "Live — /sync/ws" : "Connecting…"}
          </div>
          <span className="sync-stat">
            {doneCount}/{tasks.length} done
          </span>
        </div>

        <div className="presence-bar">
          <span className="presence-online" data-testid="presence-online">
            {members.length} online
          </span>
          <span className="presence-typing">
            {typing.length > 0 ? `${typing.join(", ")} typing…` : ""}
          </span>
        </div>

        {viewer && (
          <p className="presence-bar" data-testid="viewer-banner">
            Read-only viewer — the server rejects writes (declarative
            permission).
          </p>
        )}
        {denied && (
          <p className="presence-bar" data-testid="write-denied">
            Server rejected the write — you're read-only.
          </p>
        )}

        <form className="task-form" onSubmit={add}>
          <input
            aria-label="New task"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a task…"
            value={title}
          />
          <button className="primary" type="submit">
            Add
          </button>
        </form>

        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              onRemove={remove}
              onToggle={toggle}
              task={task}
            />
          ))}
          {tasks.length === 0 && <li className="task-empty">No tasks yet.</li>}
        </ul>
      </section>

      <section className="sync-card">
        <p className="section-desc" data-testid="search-label">
          Live full-text search (BM25) over task titles — a server-side index
          kept current from the same change feed; results re-rank as tasks
          change.
        </p>
        <form className="task-form" onSubmit={(event) => event.preventDefault()}>
          <input
            aria-label="Search tasks"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks…"
            value={search}
          />
        </form>
        {search.trim().length > 0 && (
          <ul className="task-list" data-testid="search-results">
            {results.map((task) => (
              <SearchResultItem key={task.id} task={task} />
            ))}
            {results.length === 0 && (
              <li className="task-empty">No matches.</li>
            )}
          </ul>
        )}
      </section>

      <section className="sync-card">
        <p className="section-desc" data-testid="rag-label">
          Live RAG retrieval via <code>@absolutejs/rag</code>'s sync-backed store
          — type a query, then ingest a document below: matching results re-rank
          live for every client, with no vector DB to run.
        </p>
        <form
          className="task-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            aria-label="Retrieval query"
            onChange={(event) => setRagQuery(event.target.value)}
            placeholder="Ask the knowledge base…"
            value={ragQuery}
          />
        </form>
        <form className="task-form" onSubmit={ingestDoc}>
          <input
            aria-label="Ingest document"
            onChange={(event) => setRagDoc(event.target.value)}
            placeholder="Ingest a document…"
            value={ragDoc}
          />
          <button className="primary" type="submit">
            Ingest
          </button>
        </form>
        {ragQuery.trim().length > 0 && (
          <ul className="task-list" data-testid="rag-results">
            {ragResults.map((hit) => (
              <RagHitItem hit={hit} key={hit.chunkId} />
            ))}
            {ragResults.length === 0 && (
              <li className="task-empty">No matches.</li>
            )}
          </ul>
        )}
      </section>

      <section className="sync-card">
        <p className="section-desc" data-testid="crdt-label">
          Conflict-free collaborative editing (CRDT) via{" "}
          <code>@absolutejs/sync/crdt</code> — a shared text field whose edits
          MERGE instead of overwriting. Open another tab and type at the same
          time: both edits survive and converge, with no clobbering and no
          per-keystroke server round-trip.
        </p>
        <textarea
          aria-label="Shared document"
          className="crdt-editor"
          data-testid="crdt-editor"
          onChange={(event) => editDoc(event.target.value)}
          rows={4}
          value={docText}
        />
      </section>

      <p className="section-desc">
        Open <code>/vue</code>, <code>/svelte</code>, <code>/angular</code>,{" "}
        <code>/html</code>, or <code>/htmx</code> in another tab and edit from
        any of them — every open client stays in sync.
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
