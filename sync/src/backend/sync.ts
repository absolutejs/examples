import {
  createSyncEngine,
  defineMutation,
  defineReactiveQuery,
  type TransactionRunner,
} from "@absolutejs/sync/engine";
import { createPresenceHub, syncSocket } from "@absolutejs/sync";

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

export const syncPlugin = syncSocket({
  engine,
  presence,
  // Read the role off the socket's query string into the per-connection ctx.
  resolveContext: (data) => ({ role: queryParam(data, "role") }),
});
