import type { FormEvent } from "react";
import { useState } from "react";
import { useSyncCollection } from "@absolutejs/sync/react";

type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

// One live collection, served over the engine's WebSocket. The hook hydrates
// once then applies diffs; mutations are optimistic and reconcile on ack.
const wsUrl = () =>
  typeof window === "undefined"
    ? "ws://localhost/sync/ws"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/sync/ws`;

export const SyncReactContent = () => {
  const { data, status, mutate } = useSyncCollection<Task>({
    collection: "tasks",
    url: wsUrl(),
  });
  const [title, setTitle] = useState("");

  const tasks = [...data].sort((a, b) => a.createdAt - b.createdAt);
  const doneCount = tasks.filter((task) => task.done).length;

  const add = (event: FormEvent) => {
    event.preventDefault();
    const value = title.trim();
    if (!value) {
      return;
    }
    setTitle("");
    void mutate({
      args: { title: value },
      name: "addTask",
      optimistic: (draft) =>
        draft.set({
          createdAt: Date.now(),
          done: false,
          id: `temp-${Date.now()}`,
          title: value,
        }),
    });
  };

  const toggle = (task: Task) =>
    void mutate({
      args: { id: task.id },
      name: "toggleTask",
      optimistic: (draft) => draft.set({ ...task, done: !task.done }),
    });

  const remove = (task: Task) =>
    void mutate({
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
        A live collection from the sync engine. The page hydrates once over a
        WebSocket, then the server pushes <code>added/removed/changed</code>{" "}
        diffs — no polling. Edits apply optimistically and reconcile when the
        server confirms.
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
            <li
              className={task.done ? "task-item done" : "task-item"}
              key={task.id}
            >
              <label>
                <input
                  checked={task.done}
                  onChange={() => toggle(task)}
                  type="checkbox"
                />
                <span>{task.title}</span>
              </label>
              <button
                aria-label="Remove"
                className="task-remove"
                onClick={() => remove(task)}
                type="button"
              >
                ×
              </button>
            </li>
          ))}
          {tasks.length === 0 && <li className="task-empty">No tasks yet.</li>}
        </ul>
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
