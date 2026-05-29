import {
  createSyncEngine,
  createTextIndex,
  defineMutation,
  defineReactiveQuery,
  defineSchedule,
  defineSearchCollection,
  field,
  type TransactionRunner,
} from "@absolutejs/sync/engine";
import { createPresenceHub, syncDevtools, syncSocket } from "@absolutejs/sync";
import { createPresencePack } from "@absolutejs/sync-pack-presence";
import { createDigestPack } from "@absolutejs/sync-pack-digest";
import { createCommentsPack } from "@absolutejs/sync-pack-comments";
import { createNotificationsPack } from "@absolutejs/sync-pack-notifications";
import { createFavoritesPack } from "@absolutejs/sync-pack-favorites";
import { createCountersPack } from "@absolutejs/sync-pack-counters";
import { rgaText, textOf, type TextState } from "@absolutejs/sync/crdt";
import { yjsText } from "@absolutejs/sync-yjs";
import { scheduled } from "@absolutejs/sync/scheduled";
import { createSyncRAGStore } from "@absolutejs/rag";
import { Elysia, t } from "elysia";

// The row our live data is made of. In a real app these are rows in your own
// database (read via Drizzle/Prisma); here an in-memory Map stands in so the
// example shows the engine surfaces, not a DB driver.
export type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

type Tx = {
  set: (task: Task) => void;
  delete: (id: string) => void;
};

const tasks = new Map<string, Task>();

const seed: ReadonlyArray<readonly [string, boolean]> = [
  ["Open this page in a second tab — or another framework", true],
  ["Add a task below; every connected client updates at once", false],
  ["Toggle or delete one from any framework's page", false],
];
seed.forEach(([title, done], index) => {
  const id = `seed-${index}`;
  tasks.set(id, { createdAt: index, done, id, title });
});

// A toy transaction: stage writes against a copy and commit only if the handler
// resolves (a throw rolls back). Real apps pass their DB's runner, e.g.
// `(run) => db.transaction(run)` or `(run) => prisma.$transaction(run)`.
const transaction: TransactionRunner = async (run) => {
  const staging = new Map(tasks);
  const txn: Tx = {
    delete: (id) => staging.delete(id),
    set: (task) => staging.set(task.id, task),
  };
  const result = await run(txn);
  tasks.clear();
  for (const [id, task] of staging) {
    tasks.set(id, task);
  }

  return result;
};

// The per-connection auth context. A client may connect read-only by passing
// `?role=viewer` on the socket URL; everyone else is an editor. `userId` is a
// random per-tab id the client mints; the presence pack uses it to keep one
// row per (channel, actor) so two tabs from the same browser still show as
// two viewers.
// `systemTrusted: true` flags a server-internal ctx (used by the
// notifications:notify HTTP route, which is host-trusted insert path).
type Ctx = { role?: string; userId?: string; systemTrusted?: boolean };

const engine = createSyncEngine({ transaction });

// Declarative, server-enforced permissions: anyone may read (the list is shared,
// so it stays live across tabs), but a "viewer" can't write. The `write` rule
// covers insert/update/delete, so a viewer's addTask/toggleTask/removeTask is
// rejected by the engine before it touches the store — the client's optimistic
// change then rolls back. Default clients (no role) are editors.
engine.registerPermissions<Task, Ctx>("tasks", {
  write: (ctx) => ctx.role !== "viewer",
});

// Declarative schema: the engine validates every task write against these field
// types before it touches the store (a bad write throws SchemaError and rolls
// back). `createdAt`/`done` are optional so addTask's { id, title } passes; the
// writer fills them in. (id is optional too — the writer mints one if omitted.)
engine.registerSchema<Task>("tasks", {
  fields: {
    createdAt: field.optional(field.number),
    done: field.optional(field.boolean),
    id: field.optional(field.string),
    title: field.string,
  },
});

// Teach the engine how to read the table — this powers reactive queries' ctx.db.
engine.registerReader("tasks", {
  all: () => [...tasks.values()],
});

// The task list is a read-set-tracked reactive query: it just reads the table
// and re-runs whenever the table changes. No `match`, no manual diffing.
engine.registerReactive(
  defineReactiveQuery<Task>({
    name: "tasks",
    key: (task) => task.id,
    run: ({ db }) => db.all<Task>("tasks"),
  }),
);

// Live full-text search over task titles: a BM25 index kept current from the
// "tasks" change feed. The subscription's params are the query string; the
// ranked top-K stream back as a normal collection, each row tagged with _score.
engine.registerSearch(
  defineSearchCollection<Task>({
    name: "taskSearch",
    table: "tasks",
    index: () =>
      createTextIndex<Task>({ fields: ["title"], key: (task) => task.id }),
    key: (task) => task.id,
    source: () => [...tasks.values()],
  }),
);

// A scheduled function: a server-side cron job whose writes go live. Every
// second it upserts a single "pulse" row; subscribers see it tick with no
// polling. This is the reactive half of C — cron decides when, the engine makes
// the effect live (a real app would also enqueue durable work here).
type Pulse = { id: string; count: number; at: number };
// Replaced (not mutated) on each write: the engine diffs rows by value but
// short-circuits when old and new are the *same object*, so a reader that
// returned a mutated-in-place singleton would never emit a change.
let pulse: Pulse = { at: Date.now(), count: 0, id: "server" };

const writePulse = (data: Pulse) => {
  pulse = { at: data.at, count: data.count, id: "server" };

  return pulse;
};
const ignorePulseDelete = () => {
  // The pulse row is a singleton — never deleted.
};
engine.registerReader("pulse", { all: () => [pulse] });
engine.registerWriter<Pulse>("pulse", {
  delete: ignorePulseDelete,
  insert: writePulse,
  update: writePulse,
});
engine.registerReactive(
  defineReactiveQuery<Pulse>({
    name: "pulse",
    key: (row) => row.id,
    run: ({ db }) => db.all<Pulse>("pulse"),
  }),
);
engine.registerSchedule(
  defineSchedule({
    name: "pulse",
    pattern: "*/1 * * * * *", // every second (6-field; leading field is seconds)
    run: ({ actions }) =>
      void actions.update("pulse", {
        at: Date.now(),
        count: pulse.count + 1,
        id: "server",
      }),
  }),
);

// Teach the engine how to persist the table (inside the transaction). Now
// actions.insert/update/delete write AND emit the live change in one step.
engine.registerWriter<Task, unknown, Tx>("tasks", {
  delete: (row: { id: string }, _ctx, txn) => {
    txn.delete(row.id);
  },
  insert: (data: { id?: string; title: string }, _ctx, txn) => {
    const task: Task = {
      createdAt: Date.now(),
      done: false,
      // Honor a client-generated id so optimistic and confirmed rows match.
      id: data.id ?? crypto.randomUUID(),
      title: data.title,
    };
    txn.set(task);

    return task;
  },
  update: (task: Task, _ctx, txn) => {
    txn.set(task);

    return task;
  },
});

engine.registerMutation(
  defineMutation({
    name: "addTask",
    handler: (args: { id?: string; title?: string }, _ctx, actions) => {
      const title = (args.title ?? "").trim();
      if (!title) {
        return null;
      }

      return actions.insert<Task>("tasks", { id: args.id, title });
    },
  }),
);

engine.registerMutation(
  defineMutation({
    name: "toggleTask",
    handler: (args: { id: string }, _ctx, actions) => {
      const current = tasks.get(args.id);
      if (!current) {
        return null;
      }

      return actions.update<Task>("tasks", { ...current, done: !current.done });
    },
  }),
);

engine.registerMutation(
  defineMutation({
    name: "removeTask",
    handler: (args: { id: string }, _ctx, actions) =>
      actions.delete("tasks", { id: args.id }),
  }),
);

// Conflict-free collaborative editing (CRDT), declared in one line. A single
// shared document row holds an RGA text-CRDT state; engine.registerCrdt tells the
// engine that field is a CRDT, so it MERGES incoming writes into the stored state
// (commutative + idempotent) instead of overwriting — two clients typing at once
// both survive and converge, no per-keystroke round-trip, no clobber, no merge
// code. It also auto-registers a "doc:merge" mutation the client hook calls.
type DocRow = { id: string; state: TextState };
const docs = new Map<string, DocRow>();
docs.set("shared", { id: "shared", state: { elements: [] } });

const writeDoc = (row: DocRow) => {
  // Replace the row (new object) so the engine's value diff emits the change.
  docs.set(row.id, row);

  return row;
};
const ignoreDocDelete = () => {
  // The shared document is a singleton — never deleted.
};
// `get` lets the engine load the committed row to merge CRDT fields against.
engine.registerReader("doc", {
  all: () => [...docs.values()],
  get: (id) => docs.get(String(id)),
  key: (row) => (typeof row === "object" && row !== null && "id" in row
    ? String(Reflect.get(row, "id"))
    : ""),
});
engine.registerWriter<DocRow>("doc", {
  delete: ignoreDocDelete,
  insert: writeDoc,
  update: writeDoc,
});
engine.registerReactive(
  defineReactiveQuery<DocRow>({
    name: "doc",
    key: (row) => row.id,
    run: ({ db }) => db.all<DocRow>("doc"),
  }),
);
// One line: declare `state` a CRDT field. The engine merges it on write and
// exposes a ready-made "doc:merge" mutation — no editDoc handler needed.
engine.registerCrdt<DocRow>("doc", { state: rgaText });

// The SAME pattern with a different CRDT backend: @absolutejs/sync-yjs wraps Yjs
// (the production-grade staple) behind the same contract. Swapping rgaText for
// yjsText is the only change — the engine, the merge, and the client hook are
// identical. Here the state is a base64 Yjs update (a string) instead of an RGA.
type NoteRow = { id: string; state: string };
const notes = new Map<string, NoteRow>();
notes.set("shared", { id: "shared", state: "" });

const writeNote = (row: NoteRow) => {
  notes.set(row.id, row);

  return row;
};
const ignoreNoteDelete = () => {
  // The shared note is a singleton — never deleted.
};
engine.registerReader("notes", {
  all: () => [...notes.values()],
  get: (id) => notes.get(String(id)),
  key: (row) =>
    typeof row === "object" && row !== null && "id" in row
      ? String(Reflect.get(row, "id"))
      : "",
});
engine.registerWriter<NoteRow>("notes", {
  delete: ignoreNoteDelete,
  insert: writeNote,
  update: writeNote,
});
engine.registerReactive(
  defineReactiveQuery<NoteRow>({
    name: "notes",
    key: (row) => row.id,
    run: ({ db }) => db.all<NoteRow>("notes"),
  }),
);
engine.registerCrdt<NoteRow>("notes", { state: yjsText });

// Live RAG retrieval, composed from @absolutejs/rag: createSyncRAGStore is a
// drop-in RAGVectorStore, but because it rides this same engine, retrieval is
// LIVE — subscribe to its collection with a query and results re-rank as
// documents are ingested. No vector DB, no extra socket: it just works.
const ragStore = createSyncRAGStore({ engine });
export const ragCollection = ragStore.retrievalCollection;

void ragStore.upsert({
  chunks: [
    {
      chunkId: "kb-1",
      text: "AbsoluteJS Sync keeps live collections in sync over a WebSocket with row-level diffs.",
      title: "Sync engine",
    },
    {
      chunkId: "kb-2",
      text: "Scheduled functions run on a cron pattern and their writes go live through the change feed.",
      title: "Scheduled functions",
    },
    {
      chunkId: "kb-3",
      text: "Declarative permissions gate reads and writes with row-level rules.",
      title: "Permissions",
    },
  ],
});

// Ingesting a document re-ranks every live retrieval subscriber for free.
engine.registerMutation(
  defineMutation({
    name: "ingestDoc",
    handler: async (args: { id?: string; text?: string }) => {
      const text = (args.text ?? "").trim();
      if (!text) {
        return null;
      }
      await ragStore.upsert({
        chunks: [{ chunkId: args.id ?? crypto.randomUUID(), text }],
      });

      return null;
    },
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// FLAGSHIP: a collaborative issue tracker on top of the same engine.
// Issues are a richer row model than tasks: each row has a title, a status,
// AND a CRDT body (a per-row collaborative description). The same primitives
// from above — permissions, schema, search, RAG, presence — compose on top.
// ─────────────────────────────────────────────────────────────────────────────

export type Issue = {
  id: string;
  title: string;
  status: "open" | "in-progress" | "done";
  assignee: string | null;
  body: TextState;
  createdAt: number;
  updatedAt: number;
};

const issues = new Map<string, Issue>();

const issueSeed: ReadonlyArray<readonly [string, Issue["status"], string]> = [
  [
    "Welcome — open this in another tab to see live sync",
    "open",
    "Edit me. Open this same issue in another tab and type at the same time — the body merges live (it's a CRDT field on the row).",
  ],
  ["Search me: ship 1.0", "in-progress", "Cut the 1.0 release. ✅"],
  ["Search me: write the docs", "open", "Long-form docs section per topic."],
  ["Closed example", "done", "Finished work goes here."],
];
const elementsOf = (text: string): TextState => {
  // Build a CRDT state from a plain string by running the RGA insert client
  // once — keeps seed bodies editable + mergeable from the start.
  const crdt = rgaText.create("seed");
  if (text.length > 0) crdt.setText(text);

  return crdt.state();
};
issueSeed.forEach(([title, status, body], index) => {
  const id = `issue-seed-${index}`;
  issues.set(id, {
    assignee: index === 0 ? "alex" : null,
    body: elementsOf(body),
    createdAt: index,
    id,
    status,
    title,
    updatedAt: index,
  });
});

// The engine takes ONE `transaction` runner (used for tasks above), so the
// issues writers can't safely thread their writes through that tasks-shaped
// txn. Issues instead mutate their own Map directly — the engine doesn't
// require a custom transaction, and per-domain isolation falls out naturally.
engine.registerPermissions<Issue, Ctx>("issues", {
  write: (ctx) => ctx.role !== "viewer",
});

engine.registerSchema<Issue>("issues", {
  fields: {
    assignee: field.optional(field.any),
    body: field.optional(field.any),
    createdAt: field.optional(field.number),
    id: field.optional(field.string),
    status: field.optional(field.enum("open", "in-progress", "done")),
    title: field.string,
    updatedAt: field.optional(field.number),
  },
});

// Declare `body` a CRDT field. The engine auto-merges concurrent writes into
// the stored state and auto-registers an "issues:merge" mutation the client
// hook calls — so two tabs typing the description converge with no clobbering.
engine.registerCrdt<Issue>("issues", { body: rgaText });

engine.registerReader("issues", {
  all: () => [...issues.values()],
  get: (id) => issues.get(String(id)),
  key: (row) =>
    typeof row === "object" && row !== null && "id" in row
      ? String(Reflect.get(row, "id"))
      : "",
});
engine.registerWriter<Issue>("issues", {
  delete: (row: { id: string }) => {
    issues.delete(row.id);
    // Incremental RAG maintenance: drop the chunk for this row so future
    // retrievals don't surface a deleted issue.
    void unindexIssue(row.id);
  },
  insert: (data: Partial<Issue>) => {
    const now = Date.now();
    const id = data.id ?? crypto.randomUUID();
    // Client-supplied id collisions: refuse rather than silently overwrite the
    // existing row. The optimistic insert on the client rolls back via the
    // mutation's catch handler.
    if (data.id !== undefined && issues.has(data.id)) {
      throw new Error(`Issue ${data.id} already exists`);
    }
    const issue: Issue = {
      assignee: data.assignee ?? null,
      body: data.body ?? elementsOf(""),
      createdAt: now,
      id,
      status: data.status ?? "open",
      title: data.title ?? "Untitled",
      updatedAt: now,
    };
    issues.set(issue.id, issue);
    void reindexIssue(issue);

    return issue;
  },
  update: (data: Partial<Issue> & { id: string }) => {
    const current = issues.get(data.id);
    if (!current) throw new Error(`Issue ${data.id} not found`);
    const next: Issue = {
      ...current,
      ...data,
      updatedAt: Date.now(),
    };
    issues.set(next.id, next);
    void reindexIssue(next);

    return next;
  },
});

engine.registerReactive(
  defineReactiveQuery<Issue>({
    key: (issue) => issue.id,
    name: "issues",
    run: ({ db }) => db.all<Issue>("issues"),
  }),
);

engine.registerSearch(
  defineSearchCollection<Issue>({
    index: () =>
      createTextIndex<Issue>({
        fields: ["title"],
        key: (issue) => issue.id,
      }),
    key: (issue) => issue.id,
    name: "issueSearch",
    source: () => [...issues.values()],
    table: "issues",
  }),
);

engine.registerMutation(
  defineMutation({
    handler: (args: { id?: string; title?: string }, _ctx, actions) => {
      const title = (args.title ?? "").trim();
      if (!title) return null;

      // Pass the client's id through so the optimistic row and the server-
      // confirmed row are the same node — no swap, no orphaned selection.
      return actions.insert<Issue>("issues", { id: args.id, title });
    },
    name: "createIssue",
  }),
);
engine.registerMutation(
  defineMutation({
    handler: (
      args: { id: string; status: Issue["status"] },
      _ctx,
      actions,
    ) => {
      const current = issues.get(args.id);
      if (!current) return null;

      return actions.update<Issue>("issues", {
        id: args.id,
        status: args.status,
      });
    },
    name: "setStatus",
  }),
);
engine.registerMutation(
  defineMutation({
    handler: (args: { id: string }, _ctx, actions) =>
      actions.delete("issues", { id: args.id }),
    name: "deleteIssue",
  }),
);

// AI: a "summarize" mutation. Mock provider — same shape as a real
// @absolutejs/ai provider so swapping it for `anthropic({ apiKey })` (or any
// other) is a one-line change. Keeps the demo + e2e keyless.
type Provider = {
  stream: (params: {
    messages: { content: string; role: "user" | "assistant" | "system" }[];
  }) => AsyncIterable<{ type: "text" | "done"; content?: string }>;
};
const mockProvider: Provider = {
  stream: async function* (params) {
    const last = [...params.messages].pop();
    const said =
      typeof last?.content === "string" ? last.content : "the issue body";
    const words = said.split(/\s+/).slice(0, 14).join(" ");
    const trailing = said.split(/\s+/).length > 14 ? "…" : "";
    const reply = `Summary (mock): the gist is "${words}${trailing}".`;
    yield { content: reply, type: "text" };
    yield { type: "done" };
  },
};
const summarize = async (issue: Issue): Promise<string> => {
  const body = textOf(issue.body);
  const messages: Parameters<Provider["stream"]>[0]["messages"] = [
    { content: "You summarise issue descriptions tersely.", role: "system" },
    {
      content: body.length > 0 ? body : `Issue titled "${issue.title}".`,
      role: "user",
    },
  ];
  let out = "";
  for await (const chunk of mockProvider.stream({ messages })) {
    if (chunk.type === "text" && chunk.content) out += chunk.content;
  }

  return out;
};
engine.registerMutation(
  defineMutation({
    handler: async (args: { id: string }) => {
      const issue = issues.get(args.id);
      if (!issue) return null;

      return { id: issue.id, summary: await summarize(issue) };
    },
    name: "summarizeIssue",
  }),
);

// Live "similar issues" by routing each issue's title + body through the SAME
// ragStore used by the KB demo above — so retrieval results blend KB chunks
// AND issue rows, and re-rank live as bodies are edited. The writers above
// call these helpers directly so we touch only the affected row instead of
// rescanning the whole Map on every change.
const reindexIssue = (issue: Issue) => {
  const body = textOf(issue.body);
  return ragStore.upsert({
    chunks: [
      {
        chunkId: `issue:${issue.id}`,
        // Index title + body so freshly-created issues (empty body) still
        // surface in retrieval by their title alone.
        text: body.length > 0 ? `${issue.title}\n${body}` : issue.title,
        title: issue.title,
      },
    ],
  });
};
const unindexIssue = (issueId: string) => {
  // `delete` is optional on the RAGVectorStore contract; not every backend
  // supports targeted deletion. Fall back to a no-op so the writer stays clean.
  if (ragStore.delete === undefined) return;

  return ragStore.delete({ chunkIds: [`issue:${issueId}`] });
};
// Bulk-seed the index once from the in-memory issues. After this, the writers
// keep it in sync incrementally (insert/update → reindex one row; delete →
// remove one chunk).
for (const issue of issues.values()) {
  void reindexIssue(issue);
}

// A separate per-status "team activity" pulse — distinct from the `pulse`
// row above (which is a tick counter for the tasks demo). Subscribers to this
// table see a 10-second tick of {open, in-progress, done} counts with no poll.
type TeamPulse = {
  id: string;
  open: number;
  inProgress: number;
  done: number;
  at: number;
};
const computeTeamCounts = () => {
  const counts = { done: 0, inProgress: 0, open: 0 };
  for (const issue of issues.values()) {
    if (issue.status === "done") counts.done += 1;
    else if (issue.status === "in-progress") counts.inProgress += 1;
    else counts.open += 1;
  }

  return counts;
};
// Initialise with the real counts so the very first subscriber sees an
// accurate snapshot (not zeros until the 10s cron fires for the first time).
let teamPulse: TeamPulse = {
  at: Date.now(),
  id: "team",
  ...computeTeamCounts(),
};
const writeTeamPulse = (data: TeamPulse) => {
  teamPulse = { ...data, id: "team" };

  return teamPulse;
};
const ignoreTeamPulseDelete = () => {
  // singleton row — never deleted
};
engine.registerReader("teamPulse", { all: () => [teamPulse] });
engine.registerWriter<TeamPulse>("teamPulse", {
  delete: ignoreTeamPulseDelete,
  insert: writeTeamPulse,
  update: writeTeamPulse,
});
engine.registerReactive(
  defineReactiveQuery<TeamPulse>({
    key: (row) => row.id,
    name: "teamPulse",
    run: ({ db }) => db.all<TeamPulse>("teamPulse"),
  }),
);
engine.registerSchedule(
  defineSchedule({
    name: "teamPulse",
    pattern: "*/10 * * * * *", // every 10s
    run: ({ actions }) => {
      void actions.update("teamPulse", {
        at: Date.now(),
        ...computeTeamCounts(),
        id: "team",
      });
    },
  }),
);
// Durable, queryable presence as a sync pack: each connected actor heartbeats
// `presence:heartbeat({ channel, state })`; the pack upserts a row in the owned
// `presence` table and refreshes its TTL. A subscribe to the `presence`
// collection with `{ channel: "shared" }` returns the live member list. The
// `presence:cleanup` schedule (registered by the pack) fires every 5 seconds
// via the `scheduled` plugin and reaps rows past TTL.
//
// This complements — does NOT replace — the ws-broadcast `createPresenceHub`
// below: that one is for ephemeral, low-latency signals (typing, cursor
// position); the pack is for queryable membership ("who's currently in this
// channel"). Two different presence patterns, both ride this engine.
// Host-side "users" table for the comments-with-author join. The example
// mints a deterministic display name from the userId so two browser tabs
// (each with a stable per-tab userId) consistently show as the same author
// across page reloads. A real app would back this with its real users
// table (Drizzle, Prisma, etc.).
type DemoUser = { id: string; displayName: string };
const demoUsers = new Map<string, DemoUser>();
const demoDisplayName = (userId: string) =>
  // First 6 chars + a "Guest" prefix — readable, distinct per tab.
  `Guest ${userId.slice(0, 6)}`;
const ensureDemoUser = (userId: string): DemoUser => {
  let user = demoUsers.get(userId);
  if (user === undefined) {
    user = { displayName: demoDisplayName(userId), id: userId };
    demoUsers.set(userId, user);
    // Emit so any join collection sees the row materialize.
    void engine.applyChange("users", { op: "insert", row: user });
  }
  return user;
};
engine.registerReader("users", { all: () => [...demoUsers.values()] });
engine.registerWriter<DemoUser>("users", {
  delete: (row) => {
    demoUsers.delete(row.id);
  },
  insert: (row) => {
    demoUsers.set(row.id, row);
    return row;
  },
  update: (row) => {
    demoUsers.set(row.id, row);
    return row;
  },
});

// Threaded comments on a single shared discussion resource. canReadResource
// is "anyone can read" for the demo (tasks/issues are world-readable here);
// a real app would gate this on the resource's ACL. Each tab's userId is
// the comment author — the per-row write permission stamps that on insert.
// 0.2+: `joinUsers` registers an additional `comments-with-author`
// collection so the UI can show display names instead of raw uuids.
engine.registerPack(
  createCommentsPack<Ctx, DemoUser>({
    canReadResource: () => true,
    getActorId: (ctx) => ctx.userId,
    joinUsers: {
      hydrate: () => [...demoUsers.values()],
    },
    // 0.4: emoji reactions. Restrict to a small palette so the UI can show
    // fixed buttons (no free-form picker).
    reactions: {
      allowedEmojis: ["👍", "❤️", "🎉"],
    },
  }),
);

// Per-actor inbox via the notifications pack. `notify` is host-trusted —
// the demo route stamps `systemTrusted: true` on the ctx so the pack's
// insert permission (which routes through canModerate) accepts the call.
// A real app uses systemTrusted as a server-internal flag never set from
// the client side.
engine.registerPack(
  createNotificationsPack<Ctx>({
    canModerate: (ctx) => ctx.systemTrusted === true,
    getActorId: (ctx) => ctx.userId,
  }),
);

// Per-actor favorites against the existing `tasks` table. The join is
// configured so the React panel can subscribe to "my favorited tasks"
// in one call and get { ...favorite, resource: Task } per row.
engine.registerPack(
  createFavoritesPack<Ctx, Task>({
    getActorId: (ctx) => ctx.userId,
    joinResources: {
      hydrate: () => [...tasks.values()],
      table: "tasks",
    },
  }),
);

// Live counters via createCountersPack — three reactive queries the React
// page renders as a small badge row. Each one's read-set is tracked: e.g.
// `openTasks` re-runs only when the tasks table changes, not when comments
// or notifications change.
engine.registerPack(
  createCountersPack<Ctx>({
    counters: {
      // Public — anyone (even unauthenticated) gets to see it. Authorize
      // override is the documented escape hatch for global stats.
      doneTasks: {
        authorize: () => true,
        compute: async ({ db }) => {
          const rows = await db.all<Task>("tasks");

          return rows.filter((task) => task.done).length;
        },
      },
      openTasks: {
        authorize: () => true,
        compute: async ({ db }) => {
          const rows = await db.all<Task>("tasks");

          return rows.filter((task) => !task.done).length;
        },
      },
      // Per-actor — reads ctx, so each subscriber gets their own value.
      // Requires authentication (default authorize gates on getActorId).
      totalComments: {
        authorize: () => true,
        compute: async ({ db }) => {
          const rows = await db.all("comments");

          return rows.length;
        },
      },
    },
    getActorId: (ctx) => ctx.userId,
  }),
);

engine.registerPack(
  createPresencePack<Ctx>({
    getActorId: (ctx) => ctx.userId,
    heartbeatTtlSec: 15,
    cleanupCron: "*/5 * * * * *",
  }),
);

// Scheduled per-actor digests — the third sync-packs example. The schedule
// iterates the actor list every 15s, asks `buildDigest` for content, and
// dispatches via a host-provided `send` adapter. For the demo:
//   • `listActors` is a Set of userIds seen on socket connect (so the
//     digest fires for whoever is currently using the app).
//   • `send` writes into an in-memory `digest_log` table the React page
//     subscribes to, so "sending an email" is visible in the UI without
//     wiring SMTP.
//   • `minHoursBetweenDigests: 0` so manual "Fire digest now" button
//     clicks aren't blocked by the weekly cool-down.
// A real production app would set `cron: '0 8 * * 1'` and pass a real
// `send` (Resend/SES/Postmark).
const digestActors = new Set<string>();

type DigestLogEntry = {
  id: string;
  actorId: string;
  subject: string;
  body: string;
  sentAt: number;
};
const digestLog: DigestLogEntry[] = [];
engine.registerReader("digest_log", { all: () => [...digestLog] });
engine.registerReactive(
  defineReactiveQuery<DigestLogEntry>({
    key: (row) => row.id,
    name: "digest_log",
    run: ({ db }) => db.all<DigestLogEntry>("digest_log"),
  }),
);

engine.registerPack(
  createDigestPack<Ctx>({
    buildDigest: async (actorId, since) => {
      const sinceLabel = since === null
        ? "your first digest"
        : `since ${new Date(since.getTime()).toISOString()}`;
      return {
        body:
          `Hi ${actorId}, here's what happened ${sinceLabel}. (This is a demo "
          + "digest from the example app — a real one would summarize feed activity.)`,
        subject: `Weekly digest for ${actorId}`,
        to: `${actorId}@example.invalid`,
      };
    },
    cron: "*/15 * * * * *",
    getActorId: (ctx) => ctx.userId,
    listActors: () => digestActors,
    minHoursBetweenDigests: 0,
    send: async (msg) => {
      const id = globalThis.crypto.randomUUID();
      const actorId = msg.to.split("@")[0] ?? "unknown";
      const entry: DigestLogEntry = {
        actorId,
        body: msg.body,
        id,
        sentAt: Date.now(),
        subject: msg.subject,
      };
      digestLog.push(entry);
      // Trim to a small tail so the in-memory list doesn't grow forever.
      while (digestLog.length > 20) digestLog.shift();
      // Emit a live change so subscribers see the new entry immediately.
      await engine.applyChange("digest_log", { op: "insert", row: entry });
    },
  }),
);

// Ephemeral presence (who's online / typing) rides the same socket.
const presence = createPresenceHub();

// Pull a string query param off the socket's upgrade data without a type
// assertion (the example's lint forbids `as`).
const queryParam = (data: Record<string, unknown>, name: string) => {
  const { query } = data;
  if (typeof query !== "object" || query === null) {
    return undefined;
  }
  const value: unknown = Reflect.get(query, name);

  return typeof value === "string" ? value : undefined;
};

// ─────────────────────────────────────────────────────────────────────────────
// Eden-typed HTTP surface — `treaty<typeof server>` on the client reads these
// signatures and gives end-to-end types with no codegen. The WebSocket
// (`syncSocket`) still streams live diffs; these typed routes are the
// hydrate + mutate path that `syncStore` consumes. Same engine, two surfaces.
//
// Plain `.get` / `.post` instead of the `hydrateRoute` / `mutateRoute`
// helpers because the tasks collection here is set up with the lower-level
// `registerReader/Writer/Reactive` path. The point of the dogfood is that
// the typed end-to-end story works either way: Eden picks up the return
// types from the route handlers regardless of how they get to the data.
// ─────────────────────────────────────────────────────────────────────────────

const sortedTasks = (): Task[] =>
  [...tasks.values()].sort((first, second) => first.createdAt - second.createdAt);

const runMutation = (name: string, args: unknown) =>
  engine.runMutation(name, args, {});

// Compose the socket with the scheduled-functions plugin (cron triggers fire on
// server start). One `.use(syncPlugin)` mounts both.
export const syncPlugin = new Elysia()
  .use(
    syncSocket({
      engine,
      presence,
      // Read the role + per-tab user id off the socket's query string into the
      // per-connection ctx. `userId` is what the presence and digest packs use
      // to key rows; we also push the userId into `digestActors` so the
      // digest schedule iterates everyone who's currently connected.
      resolveContext: (data) => {
        const userId = queryParam(data, "userId");
        if (userId !== undefined) digestActors.add(userId);

        return {
          role: queryParam(data, "role"),
          userId,
        };
      },
    }),
  )
  .use(scheduled({ engine }))
  // Live devtools dashboard at /sync/devtools — collections, subscription
  // counts, mutations, schedules, and a streaming change/mutation feed.
  .use(syncDevtools({ engine }))
  // Typed REST surface for `treaty<typeof server>` + `syncStore` on the client.
  .get("/sync/tasks", () => sortedTasks())
  .post(
    "/sync/addTask",
    ({ body }) =>
      runMutation("addTask", body) as Promise<Task | null>,
    { body: t.Object({ id: t.Optional(t.String()), title: t.String() }) },
  )
  .post(
    "/sync/toggleTask",
    ({ body }) =>
      runMutation("toggleTask", body) as Promise<Task | null>,
    { body: t.Object({ id: t.String() }) },
  )
  .post(
    "/sync/removeTask",
    ({ body }) => runMutation("removeTask", body),
    { body: t.Object({ id: t.String() }) },
  )
  // Presence-pack heartbeat/leave HTTP shims. A production app would call
  // these mutations through the syncStore (which rides the socket); they're
  // wired as plain Eden routes here so the demo can drive presence with one
  // `fetch` from the React component, without an extra abstraction.
  .post(
    "/sync/presence/heartbeat",
    ({ body }) =>
      engine.runMutation(
        "presence:heartbeat",
        { channel: body.channel, state: { name: body.name } },
        { userId: body.userId },
      ),
    {
      body: t.Object({
        channel: t.String(),
        userId: t.String(),
        name: t.String(),
      }),
    },
  )
  .post(
    "/sync/presence/leave",
    ({ body }) =>
      engine.runMutation(
        "presence:leave",
        { channel: body.channel },
        { userId: body.userId },
      ),
    { body: t.Object({ channel: t.String(), userId: t.String() }) },
  )
  // Fire the digest schedule now. Useful for the demo — production apps
  // let the cron fire on its own.
  .post(
    "/sync/digest/fire",
    async () => {
      await engine.runSchedule("digest:fire");

      return { ok: true };
    },
  )
  // Comments-pack HTTP shims. Same pattern as the presence routes:
  // production apps would call these mutations through syncStore (which
  // rides the socket); here they're Eden routes so the React component
  // drives them with one fetch().
  .post(
    "/sync/comments/create",
    ({ body }) => {
      // Make sure the author exists in the host "users" table so the
      // comments-with-author join can pair them.
      ensureDemoUser(body.userId);

      return engine.runMutation(
        "comments:create",
        { body: body.body, resourceId: body.resourceId },
        { userId: body.userId },
      );
    },
    {
      body: t.Object({
        body: t.String(),
        resourceId: t.String(),
        userId: t.String(),
      }),
    },
  )
  .post(
    "/sync/comments/edit",
    ({ body }) =>
      engine.runMutation(
        "comments:edit",
        { body: body.body, commentId: body.commentId },
        { userId: body.userId },
      ),
    {
      body: t.Object({
        body: t.String(),
        commentId: t.String(),
        userId: t.String(),
      }),
    },
  )
  .post(
    "/sync/comments/delete",
    ({ body }) =>
      engine.runMutation(
        "comments:delete",
        { commentId: body.commentId },
        { userId: body.userId },
      ),
    {
      body: t.Object({
        commentId: t.String(),
        userId: t.String(),
      }),
    },
  )
  .post(
    "/sync/comments/toggleReaction",
    ({ body }) =>
      engine.runMutation(
        "comments:toggleReaction",
        { commentId: body.commentId, emoji: body.emoji },
        { userId: body.userId },
      ),
    {
      body: t.Object({
        commentId: t.String(),
        emoji: t.String(),
        userId: t.String(),
      }),
    },
  )
  // notifications:notify — host-trusted insert. The demo button hits this
  // route; production apps would call notify from webhooks or other
  // server-side paths, never from the client directly.
  .post(
    "/sync/notifications/notify",
    ({ body }) =>
      engine.runMutation(
        "notifications:notify",
        {
          actorId: body.actorId,
          body: body.body,
          href: body.href ?? null,
          kind: body.kind,
          title: body.title,
        },
        { systemTrusted: true, userId: "system" },
      ),
    {
      body: t.Object({
        actorId: t.String(),
        body: t.String(),
        href: t.Optional(t.String()),
        kind: t.String(),
        title: t.String(),
      }),
    },
  )
  .post(
    "/sync/notifications/markRead",
    ({ body }) =>
      engine.runMutation(
        "notifications:markRead",
        { notificationId: body.notificationId },
        { userId: body.userId },
      ),
    {
      body: t.Object({
        notificationId: t.String(),
        userId: t.String(),
      }),
    },
  )
  .post(
    "/sync/notifications/markAllRead",
    ({ body }) =>
      engine.runMutation(
        "notifications:markAllRead",
        undefined,
        { userId: body.userId },
      ),
    {
      body: t.Object({
        userId: t.String(),
      }),
    },
  )
  // favorites:toggle — single round-trip per click. Returns the new state.
  .post(
    "/sync/favorites/toggle",
    ({ body }) =>
      engine.runMutation(
        "favorites:toggle",
        { resourceId: body.resourceId, resourceKind: body.resourceKind },
        { userId: body.userId },
      ),
    {
      body: t.Object({
        resourceId: t.String(),
        resourceKind: t.String(),
        userId: t.String(),
      }),
    },
  )
  // favorites:togglePin (0.2) — flips the per-actor pinnedAt timestamp so
  // clients can sort pinned-first.
  .post(
    "/sync/favorites/togglePin",
    ({ body }) =>
      engine.runMutation(
        "favorites:togglePin",
        { resourceId: body.resourceId, resourceKind: body.resourceKind },
        { userId: body.userId },
      ),
    {
      body: t.Object({
        resourceId: t.String(),
        resourceKind: t.String(),
        userId: t.String(),
      }),
    },
  );
