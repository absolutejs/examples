import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  useCollaborativeText,
  useSyncCollection,
} from "@absolutejs/sync/react";
import { createPresence } from "@absolutejs/sync/client";
import type {
  PresenceClient,
  PresenceMember,
} from "@absolutejs/sync/client";

// A row from the backend "issues" collection. body is a CRDT state object —
// the collaborative editor reads/writes it via useCollaborativeText.
type Issue = {
  id: string;
  title: string;
  status: "open" | "in-progress" | "done";
  assignee: string | null;
  body: unknown;
  createdAt: number;
  updatedAt: number;
};

type SearchHit = Issue & { _score?: number };
type Pulse = {
  id: string;
  open: number;
  inProgress: number;
  done: number;
  at: number;
};
type Presence = { name: string };

const roleParam = () =>
  typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("role");

const wsUrl = () => {
  if (typeof window === "undefined") return "ws://localhost/sync/ws";
  const role = roleParam();
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const query = role ? `?role=${encodeURIComponent(role)}` : "";

  return `${protocol}://${window.location.host}/sync/ws${query}`;
};

const randomName = () => `User-${globalThis.crypto.randomUUID().split("-")[0]}`;

const STATUS_LABEL: Record<Issue["status"], string> = {
  done: "Done",
  "in-progress": "In progress",
  open: "Open",
};

const STATUS_ORDER: Issue["status"][] = ["open", "in-progress", "done"];

type IssueRowProps = {
  issue: Issue;
  selected: boolean;
  onSelect: (id: string) => void;
};

const IssueRow = ({ issue, onSelect, selected }: IssueRowProps) => (
  <li
    className={selected ? "issue-row selected" : "issue-row"}
    data-testid="issue-row"
    onClick={() => onSelect(issue.id)}
  >
    <span className={`status pill-${issue.status}`}>
      {STATUS_LABEL[issue.status]}
    </span>
    <span className="title">{issue.title}</span>
  </li>
);

export const IssuesContent = () => {
  const url = useMemo(() => wsUrl(), []);
  const issuesCol = useSyncCollection<Issue>({ collection: "issues", url });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Issue["status"] | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [viewer, setViewer] = useState(false);
  const [denied, setDenied] = useState(false);

  // Live full-text search — params ARE the query string.
  const searchHits = useSyncCollection<SearchHit>({
    collection: "issueSearch",
    params: search,
    url,
  });

  // Server-side pulse counter (a cron job ticks team stats every 10s).
  const pulseCol = useSyncCollection<Pulse>({ collection: "pulse", url });
  const [pulse] = pulseCol.data;

  // Presence (who else is here right now).
  const [members, setMembers] = useState<PresenceMember<Presence>[]>([]);
  useEffect(() => {
    const client: PresenceClient<Presence> = createPresence<Presence>({
      room: "issues",
      state: { name: randomName() },
      url,
    });
    const unsubscribe = client.subscribe(setMembers);

    return () => {
      unsubscribe();
      client.close();
    };
  }, [url]);

  useEffect(() => {
    setViewer(roleParam() === "viewer");
  }, []);

  const submit = (options: Parameters<typeof issuesCol.mutate>[0]) => {
    setDenied(false);
    void issuesCol.mutate(options).catch(() => setDenied(true));
  };

  const sortedIssues = [...issuesCol.data].sort(
    (first, second) => second.updatedAt - first.updatedAt,
  );
  const visibleIssues =
    search.trim().length > 0
      ? [...searchHits.data].sort(
          (first, second) => (second._score ?? 0) - (first._score ?? 0),
        )
      : sortedIssues.filter(
          (issue) => filterStatus === "all" || issue.status === filterStatus,
        );

  const selected = selectedId
    ? (issuesCol.data.find((issue) => issue.id === selectedId) ?? null)
    : null;

  const createIssue = (event: FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    const id = globalThis.crypto.randomUUID();
    submit({
      args: { id, title },
      name: "createIssue",
      optimistic: (draft) =>
        draft.set({
          assignee: null,
          body: { elements: [] },
          createdAt: Date.now(),
          id,
          status: "open",
          title,
          updatedAt: Date.now(),
        }),
    });
    setSelectedId(id);
  };

  const setStatus = (issue: Issue, status: Issue["status"]) =>
    submit({
      args: { id: issue.id, status },
      name: "setStatus",
      optimistic: (draft) => draft.set({ ...issue, status }),
    });

  const removeIssue = (issue: Issue) => {
    if (selectedId === issue.id) setSelectedId(null);
    submit({
      args: { id: issue.id },
      name: "deleteIssue",
      optimistic: (draft) => draft.delete(issue.id),
    });
  };

  return (
    <main className="app">
      <header className="app-bar">
        <h1>Issues</h1>
        <div className="app-bar-right">
          <span
            className={
              issuesCol.status === "ready"
                ? "conn-dot conn-live"
                : "conn-dot"
            }
            title={issuesCol.status}
          />
          <span data-testid="presence-online">{members.length} online</span>
          {pulse ? (
            <span className="counts" data-testid="counts">
              {pulse.open} open · {pulse.inProgress} in progress ·{" "}
              {pulse.done} done
            </span>
          ) : null}
        </div>
      </header>

      {viewer ? (
        <p className="viewer-bar" data-testid="viewer-banner">
          Read-only viewer — the server rejects writes (declarative permission).
        </p>
      ) : null}
      {denied ? (
        <p className="viewer-bar" data-testid="write-denied">
          Server rejected the write.
        </p>
      ) : null}

      <div className="layout">
        <aside className="sidebar">
          <form className="create-form" onSubmit={createIssue}>
            <input
              aria-label="New issue title"
              data-testid="new-issue"
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="New issue title…"
              value={newTitle}
            />
            <button className="primary" type="submit">
              Create
            </button>
          </form>

          <div className="filter-row">
            <button
              className={filterStatus === "all" ? "filter on" : "filter"}
              onClick={() => setFilterStatus("all")}
              type="button"
            >
              All
            </button>
            {STATUS_ORDER.map((status) => (
              <button
                className={
                  filterStatus === status ? "filter on" : "filter"
                }
                key={status}
                onClick={() => setFilterStatus(status)}
                type="button"
              >
                {STATUS_LABEL[status]}
              </button>
            ))}
          </div>

          <form
            className="search-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <input
              aria-label="Search issues"
              data-testid="search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search…"
              value={search}
            />
          </form>

          <ul className="issue-list" data-testid="issue-list">
            {visibleIssues.map((issue) => (
              <IssueRow
                issue={issue}
                key={issue.id}
                onSelect={setSelectedId}
                selected={selectedId === issue.id}
              />
            ))}
            {visibleIssues.length === 0 ? (
              <li className="empty">No matches.</li>
            ) : null}
          </ul>
        </aside>

        <section className="detail">
          {selected ? (
            <IssueDetail
              issue={selected}
              onRemove={removeIssue}
              onSetStatus={setStatus}
              url={url}
            />
          ) : (
            <p className="empty hint" data-testid="hint">
              Pick an issue on the left to see its collaborative description.
            </p>
          )}
        </section>
      </div>
    </main>
  );
};

type IssueDetailProps = {
  issue: Issue;
  onSetStatus: (issue: Issue, status: Issue["status"]) => void;
  onRemove: (issue: Issue) => void;
  url: string;
};

const IssueDetail = ({ issue, onRemove, onSetStatus, url }: IssueDetailProps) => {
  // The collaborative description: text-CRDT, anchored by the row id.
  const doc = useCollaborativeText({
    collection: "issues",
    field: "body",
    id: issue.id,
    url,
  });

  return (
    <article className="issue-detail" data-testid="issue-detail">
      <header className="issue-header">
        <h2 data-testid="issue-title">{issue.title}</h2>
        <div className="issue-meta">
          <label>
            Status
            <select
              data-testid="status-select"
              onChange={(event) =>
                onSetStatus(issue, event.target.value as Issue["status"])
              }
              value={issue.status}
            >
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <button
            className="danger"
            onClick={() => onRemove(issue)}
            type="button"
          >
            Delete
          </button>
        </div>
      </header>

      <p className="hint">
        Open this same issue in another tab. Type here at the same time — both
        edits merge live (it's a CRDT field on the row).
      </p>

      <textarea
        aria-label="Description"
        className="body-editor"
        data-testid="body-editor"
        onChange={(event) => doc.setText(event.target.value)}
        rows={10}
        value={doc.text}
      />
    </article>
  );
};
