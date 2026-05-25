import {
  createSyncEngine,
  defineCollection,
  defineMutation,
} from "@absolutejs/sync/engine";
import { syncSocket } from "@absolutejs/sync";

// The row our live collection is made of. In a real app these are rows in your
// own database (read via Drizzle/Prisma); here an in-memory Map is enough to
// show the Tier 3 sync engine: hydrate once, then push { added, removed,
// changed } diffs to every subscriber over one WebSocket.
export type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

const tasks = new Map<string, Task>();

[
  ["Open this page in a second tab — or another framework", true],
  ["Add a task below; every connected client updates at once", false],
  ["Toggle or delete one from any framework's page", false],
].forEach(([title, done], index) => {
  const id = `seed-${index}`;
  tasks.set(id, {
    createdAt: index,
    done: done as boolean,
    id,
    title: title as string,
  });
});

const engine = createSyncEngine();

// One reactive collection. `match: () => true` keeps every task in the set; a
// real app would scope rows with `authorize`/`match` so a user only ever syncs
// what they're allowed to read.
engine.register(
  defineCollection<Task>({
    hydrate: () => [...tasks.values()],
    key: (task) => task.id,
    match: () => true,
    name: "tasks",
  }),
);

// Mutations are the change source: they write the store and emit the row change,
// which the engine turns into a diff for every subscriber. The browser applies
// each optimistically first, then reconciles when the server confirms.
engine.registerMutation(
  defineMutation({
    handler: async (args: { title?: string }, _ctx, actions) => {
      const title = (args.title ?? "").trim();
      if (!title) {
        return null;
      }
      const task: Task = {
        createdAt: Date.now(),
        done: false,
        id: crypto.randomUUID(),
        title,
      };
      tasks.set(task.id, task);
      await actions.change("tasks", { op: "insert", row: task });

      return task;
    },
    name: "addTask",
  }),
);

engine.registerMutation(
  defineMutation({
    handler: async (args: { id: string }, _ctx, actions) => {
      const task = tasks.get(args.id);
      if (!task) {
        return null;
      }
      const next: Task = { ...task, done: !task.done };
      tasks.set(next.id, next);
      await actions.change("tasks", { op: "update", row: next });

      return next;
    },
    name: "toggleTask",
  }),
);

engine.registerMutation(
  defineMutation({
    handler: async (args: { id: string }, _ctx, actions) => {
      const task = tasks.get(args.id);
      if (!task) {
        return null;
      }
      tasks.delete(task.id);
      await actions.change("tasks", { op: "delete", row: task });

      return { id: task.id };
    },
    name: "removeTask",
  }),
);

// First-class Elysia WebSocket: one socket multiplexes the subscription and the
// mutations. The client connects at /sync/ws.
export const syncPlugin = syncSocket({ engine });
