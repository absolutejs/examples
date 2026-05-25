import {
  createSyncEngine,
  createTextIndex,
  defineMutation,
  defineReactiveQuery,
  defineSchedule,
  defineSearchCollection,
  type TransactionRunner,
} from "@absolutejs/sync/engine";
import { createPresenceHub, syncSocket } from "@absolutejs/sync";
import { scheduled } from "@absolutejs/sync/scheduled";
import { createSyncRAGStore } from "@absolutejs/rag";
import { Elysia } from "elysia";

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
// `?role=viewer` on the socket URL; everyone else is an editor.
type Ctx = { role?: string };

const engine = createSyncEngine({ transaction });

// Declarative, server-enforced permissions: anyone may read (the list is shared,
// so it stays live across tabs), but a "viewer" can't write. The `write` rule
// covers insert/update/delete, so a viewer's addTask/toggleTask/removeTask is
// rejected by the engine before it touches the store — the client's optimistic
// change then rolls back. Default clients (no role) are editors.
engine.registerPermissions<Task, Ctx>("tasks", {
  write: (ctx) => ctx.role !== "viewer",
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

// Compose the socket with the scheduled-functions plugin (cron triggers fire on
// server start). One `.use(syncPlugin)` mounts both.
export const syncPlugin = new Elysia()
  .use(
    syncSocket({
      engine,
      presence,
      // Read the role off the socket's query string into the per-connection ctx.
      resolveContext: (data) => ({ role: queryParam(data, "role") }),
    }),
  )
  .use(scheduled({ engine }));
