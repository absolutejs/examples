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

const engine = createSyncEngine({ transaction });

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

export const syncPlugin = syncSocket({ engine, presence });
