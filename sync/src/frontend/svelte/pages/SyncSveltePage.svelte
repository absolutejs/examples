<script lang="ts">
  import { onDestroy } from "svelte";
  import { createSyncCollectionStore } from "@absolutejs/sync/svelte";
  import Nav from "../components/Nav.svelte";

  type Task = {
    id: string;
    title: string;
    done: boolean;
    createdAt: number;
  };

  let { cssPath = undefined }: { cssPath?: string } = $props();

  const wsUrl =
    typeof window === "undefined"
      ? "ws://localhost/sync/ws"
      : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/sync/ws`;

  // A real Svelte store: `$collection` is the live { data, status, error }.
  const collection = createSyncCollectionStore<Task>({
    collection: "tasks",
    url: wsUrl,
  });
  onDestroy(() => collection.destroy());

  let title = $state("");

  const tasks = $derived(
    [...$collection.data].sort((a, b) => a.createdAt - b.createdAt),
  );
  const doneCount = $derived(tasks.filter((task) => task.done).length);

  const add = (event: Event) => {
    event.preventDefault();
    const value = title.trim();
    if (!value) {
      return;
    }
    title = "";
    void collection.mutate({
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
    void collection.mutate({
      args: { id: task.id },
      name: "toggleTask",
      optimistic: (draft) => draft.set({ ...task, done: !task.done }),
    });

  const remove = (task: Task) =>
    void collection.mutate({
      args: { id: task.id },
      name: "removeTask",
      optimistic: (draft) => draft.delete(task.id),
    });
</script>

<div>
  <Nav {cssPath} />

  <main>
    <div class="page-title">
      <img alt="Svelte" src="/assets/svg/svelte-logo.svg" />
      <h1>Svelte</h1>
      <span class="badge">@absolutejs/sync</span>
    </div>

    <p class="section-desc">
      A live collection from the sync engine. The page hydrates once over a
      WebSocket, then the server pushes <code>added/removed/changed</code> diffs —
      no polling. Edits apply optimistically and reconcile when the server confirms.
    </p>

    <section class="sync-card">
      <div class="sync-bar">
        <div class="sync-status">
          <span class={$collection.status === "ready" ? "dot dot-live" : "dot"}
          ></span>
          {$collection.status === "ready" ? "Live — /sync/ws" : "Connecting…"}
        </div>
        <span class="sync-stat">{doneCount}/{tasks.length} done</span>
      </div>

      <form class="task-form" onsubmit={add}>
        <input
          aria-label="New task"
          bind:value={title}
          placeholder="Add a task…"
        />
        <button class="primary" type="submit">Add</button>
      </form>

      <ul class="task-list">
        {#each tasks as task (task.id)}
          <li class={task.done ? "task-item done" : "task-item"}>
            <label>
              <input
                checked={task.done}
                onchange={() => toggle(task)}
                type="checkbox"
              />
              <span>{task.title}</span>
            </label>
            <button
              aria-label="Remove"
              class="task-remove"
              onclick={() => remove(task)}
              type="button">×</button
            >
          </li>
        {/each}
        {#if tasks.length === 0}
          <li class="task-empty">No tasks yet.</li>
        {/if}
      </ul>
    </section>

    <p class="section-desc">
      Open <code>/</code>, <code>/vue</code>, <code>/angular</code>,
      <code>/html</code>, or <code>/htmx</code> in another tab and edit from any of
      them — every open client stays in sync.
    </p>

    <p class="footer">
      <img alt="" src="/assets/png/absolutejs-temp.png" />
      Powered by
      <a
        href="https://absolutejs.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        AbsoluteJS
      </a>
    </p>
  </main>
</div>
