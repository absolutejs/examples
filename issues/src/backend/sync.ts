/**
 * Flagship demo: a collaborative issue tracker dogfooding the @absolutejs/sync
 * stack — live filtered queries, declarative permissions, full-text search,
 * scheduled functions, and CRDT-collaborative issue descriptions (multiple
 * people typing in the same description at once, merged on the server).
 */
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
import { scheduled } from "@absolutejs/sync/scheduled";
import { rgaText, type TextState } from "@absolutejs/sync/crdt";
import { Elysia } from "elysia";

// An issue. `body` is a CRDT text state (collaborative description). Everything
// else is plain row data the engine diffs by value.
export type Issue = {
  id: string;
  title: string;
  status: "open" | "in-progress" | "done";
  assignee: string | null;
  body: TextState;
  createdAt: number;
  updatedAt: number;
};

type Tx = {
  set: (issue: Issue) => void;
  delete: (id: string) => void;
};

const issues = new Map<string, Issue>();

// Seed with a few issues so a fresh user sees something live.
const seed: ReadonlyArray<readonly [string, Issue["status"], string]> = [
  [
    "Welcome — open this in another tab to see live sync",
    "open",
    "Edit me. Open this same issue in another tab and type at the same time — the body merges live (it's a CRDT).",
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
seed.forEach(([title, status, body], index) => {
  const id = `seed-${index}`;
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

// Toy transaction: stage writes against a copy and commit only if the handler
// resolves (a throw rolls back). A real app passes its DB's runner.
const transaction: TransactionRunner = async (run) => {
  const staging = new Map(issues);
  const txn: Tx = {
    delete: (id) => staging.delete(id),
    set: (issue) => staging.set(issue.id, issue),
  };
  const result = await run(txn);
  issues.clear();
  for (const [id, issue] of staging) issues.set(id, issue);

  return result;
};

type Ctx = { role?: string };

const engine = createSyncEngine({ transaction });

// Declarative permissions: anyone reads (it's a shared tracker), but a viewer
// (`?role=viewer`) can't write. Server-enforced; client optimistic edits roll
// back automatically on deny.
engine.registerPermissions<Issue, Ctx>("issues", {
  write: (ctx) => ctx.role !== "viewer",
});

// Schema (data integrity): required fields, body is the CRDT state shape.
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

// Declare `body` a CRDT field. The engine auto-merges it on every write so
// concurrent edits to an issue's description converge with no clobbering.
// (Also auto-registers an "issues:merge" mutation the client hook calls.)
engine.registerCrdt<Issue>("issues", { body: rgaText });

engine.registerReader("issues", {
  all: () => [...issues.values()],
  get: (id) => issues.get(String(id)),
  key: (row) =>
    typeof row === "object" && row !== null && "id" in row
      ? String(Reflect.get(row, "id"))
      : "",
});
engine.registerWriter<Issue, unknown, Tx>("issues", {
  delete: (row, _ctx, txn) => txn.delete(row.id),
  insert: (data: Partial<Issue>, _ctx, txn) => {
    const now = Date.now();
    const issue: Issue = {
      assignee: data.assignee ?? null,
      body: data.body ?? elementsOf(""),
      createdAt: now,
      id: data.id ?? crypto.randomUUID(),
      status: data.status ?? "open",
      title: data.title ?? "Untitled",
      updatedAt: now,
    };
    txn.set(issue);

    return issue;
  },
  update: (data: Partial<Issue> & { id: string }, _ctx, txn) => {
    const current = issues.get(data.id);
    if (!current) throw new Error(`Issue ${data.id} not found`);
    const next: Issue = {
      ...current,
      ...data,
      updatedAt: Date.now(),
    };
    txn.set(next);

    return next;
  },
});

// The main live list: every open/in-progress issue, sorted client-side by date.
// A read-set-tracked reactive query — re-runs only when the table changes.
engine.registerReactive(
  defineReactiveQuery<Issue>({
    key: (issue) => issue.id,
    name: "issues",
    run: ({ db }) => db.all<Issue>("issues"),
  }),
);

// Live full-text search over title + a small slice of the description. The
// subscription's params ARE the query; the ranked top-K stream back live.
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

// Mutations the UI calls.
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

// Scheduled function: every 10 seconds, refresh a "team activity" pulse row
// summarising counts. Subscribers tick without polling.
type Pulse = { id: string; open: number; inProgress: number; done: number; at: number };
let pulse: Pulse = {
  at: Date.now(),
  done: 0,
  id: "team",
  inProgress: 0,
  open: 0,
};
const writePulse = (data: Pulse) => {
  pulse = { ...data, id: "team" };

  return pulse;
};
const ignorePulseDelete = () => {};
engine.registerReader("pulse", { all: () => [pulse] });
engine.registerWriter<Pulse>("pulse", {
  delete: ignorePulseDelete,
  insert: writePulse,
  update: writePulse,
});
engine.registerReactive(
  defineReactiveQuery<Pulse>({
    key: (row) => row.id,
    name: "pulse",
    run: ({ db }) => db.all<Pulse>("pulse"),
  }),
);
engine.registerSchedule(
  defineSchedule({
    name: "pulse",
    pattern: "*/10 * * * * *", // every 10s (6-field cron, seconds-first)
    run: ({ actions }) => {
      const counts = { done: 0, inProgress: 0, open: 0 };
      for (const issue of issues.values()) {
        if (issue.status === "done") counts.done += 1;
        else if (issue.status === "in-progress") counts.inProgress += 1;
        else counts.open += 1;
      }
      void actions.update("pulse", {
        at: Date.now(),
        ...counts,
        id: "team",
      });
    },
  }),
);

// Presence: who else is viewing right now.
const presence = createPresenceHub();
const queryParam = (data: Record<string, unknown>, name: string) => {
  const { query } = data;
  if (typeof query !== "object" || query === null) return undefined;
  const value: unknown = Reflect.get(query, name);

  return typeof value === "string" ? value : undefined;
};

export const syncPlugin = new Elysia()
  .use(
    syncSocket({
      engine,
      presence,
      resolveContext: (data) => ({ role: queryParam(data, "role") }),
    }),
  )
  .use(scheduled({ engine }))
  .use(syncDevtools({ engine }));
