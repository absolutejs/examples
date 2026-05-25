<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useSyncCollection } from "@absolutejs/sync/vue";
import {
  createPresence,
  indexedDbCollectionCache,
} from "@absolutejs/sync/client";
import type { PresenceClient, PresenceMember } from "@absolutejs/sync/client";
import Nav from "../components/Nav.vue";

type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

type Presence = { name: string; typing: boolean };

const wsUrl =
  typeof window === "undefined"
    ? "ws://localhost/sync/ws"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/sync/ws`;

// Local-first: persist confirmed rows in IndexedDB for instant reads on reload
// and offline; the socket resumes from the cached version.
const taskCache = indexedDbCollectionCache<Task>({ key: "tasks" });
const { data, status, mutate } = useSyncCollection<Task>({
  cache: taskCache,
  collection: "tasks",
  url: wsUrl,
});

const title = ref("");
const tasks = computed(() =>
  [...data.value].sort((a, b) => a.createdAt - b.createdAt),
);
const doneCount = computed(
  () => tasks.value.filter((task) => task.done).length,
);

// Presence: who's online + who's typing in the shared "tasks" room.
const members = ref<PresenceMember<Presence>[]>([]);
const selfId = ref<string>();
const presenceName = `User-${Math.random().toString(36).slice(2, 6)}`;
let presence: PresenceClient<Presence> | null = null;

onMounted(() => {
  presence = createPresence<Presence>({
    room: "tasks",
    state: { name: presenceName, typing: false },
    url: wsUrl,
  });
  selfId.value = presence.id;
  presence.subscribe((next) => {
    members.value = next;
  });
});
onUnmounted(() => presence?.close());
watch(title, (value) =>
  presence?.set({ name: presenceName, typing: value.trim().length > 0 }),
);

const online = computed(() => members.value.length);
const typing = computed(() =>
  members.value
    .filter((member) => member.id !== selfId.value && member.state.typing)
    .map((member) => member.state.name),
);

const add = (event: Event) => {
  event.preventDefault();
  const value = title.value.trim();
  if (!value) {
    return;
  }
  title.value = "";
  const id = globalThis.crypto.randomUUID();
  void mutate({
    args: { id, title: value },
    name: "addTask",
    optimistic: (draft) =>
      draft.set({ createdAt: Date.now(), done: false, id, title: value }),
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
</script>

<template>
  <div>
    <Nav />
    <main>
      <div class="page-title">
        <img alt="Vue" src="/assets/svg/vue-logo.svg" />
        <h1>Vue</h1>
        <span class="badge">@absolutejs/sync</span>
      </div>

      <p class="section-desc">
        A live collection from the sync engine. The page hydrates once over a
        WebSocket, then the server pushes <code>added/removed/changed</code>
        diffs — no polling. Edits apply optimistically and reconcile when the
        server confirms.
      </p>

      <section class="sync-card">
        <div class="sync-bar">
          <div class="sync-status">
            <span :class="status === 'ready' ? 'dot dot-live' : 'dot'" />
            {{ status === "ready" ? "Live — /sync/ws" : "Connecting…" }}
          </div>
          <span class="sync-stat">{{ doneCount }}/{{ tasks.length }} done</span>
        </div>

        <div class="presence-bar">
          <span class="presence-online" data-testid="presence-online"
            >{{ online }} online</span
          >
          <span class="presence-typing">{{
            typing.length > 0 ? `${typing.join(", ")} typing…` : ""
          }}</span>
        </div>

        <form class="task-form" @submit="add">
          <input
            v-model="title"
            aria-label="New task"
            placeholder="Add a task…"
          />
          <button class="primary" type="submit">Add</button>
        </form>

        <ul class="task-list">
          <li
            v-for="task in tasks"
            :key="task.id"
            :class="task.done ? 'task-item done' : 'task-item'"
          >
            <label>
              <input
                :checked="task.done"
                type="checkbox"
                @change="toggle(task)"
              />
              <span>{{ task.title }}</span>
            </label>
            <button
              aria-label="Remove"
              class="task-remove"
              type="button"
              @click="remove(task)"
            >
              ×
            </button>
          </li>
          <li v-if="tasks.length === 0" class="task-empty">No tasks yet.</li>
        </ul>
      </section>

      <p class="section-desc">
        Open <code>/</code>, <code>/svelte</code>, <code>/angular</code>,
        <code>/html</code>, or <code>/htmx</code> in another tab and edit from
        any of them — every open client stays in sync.
      </p>

      <p class="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
          >AbsoluteJS</a
        >
      </p>
    </main>
  </div>
</template>
