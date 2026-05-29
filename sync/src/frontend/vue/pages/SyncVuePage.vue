<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useCollaborativeText, useSyncCollection } from "@absolutejs/sync/vue";
import {
  createPresence,
  indexedDbCollectionCache,
} from "@absolutejs/sync/client";
import type { PresenceClient, PresenceMember } from "@absolutejs/sync/client";
import Nav from "../components/Nav.vue";
import CommentReactions from "../components/CommentReactions.vue";

type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

type Presence = { name: string; typing: boolean };

// Pack-related row shapes (must match the server registration in
// src/backend/sync.ts).
type PresenceRow = {
  id: string;
  channel: string;
  actorId: string;
  state: { name: string };
  expiresAt: number;
  heartbeatAt: number;
};
type DigestCursor = {
  id: string;
  actorId: string;
  lastSentAt: number;
  lastSubject: string;
};
type DigestLogEntry = {
  id: string;
  actorId: string;
  subject: string;
  body: string;
  sentAt: number;
};
type CommentRow = {
  id: string;
  resourceId: string;
  parentCommentId: string | null;
  authorId: string;
  body: string;
  depth: number;
  createdAt: number;
  editedAt: number | null;
};
// 0.2+ shape from the comments-with-author join collection.
type CommentWithAuthor = CommentRow & {
  author: { id: string; displayName: string };
};
type NotificationRow = {
  id: string;
  actorId: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  createdAt: number;
  readAt: number | null;
  expiresAt: number | null;
};
type CommentReactionRow = {
  id: string;
  commentId: string;
  actorId: string;
  emoji: string;
  createdAt: number;
};
type CounterRow = {
  id: string;
  key: string;
  value: number;
  computedAt: number;
};
type FavoriteWithTask = {
  id: string;
  actorId: string;
  resourceKind: string;
  resourceId: string;
  createdAt: number;
  resource: Task;
};

// Stable per-tab user id (matches the React demo's pattern). Persisted in
// sessionStorage so a reload doesn't orphan presence rows.
const tabUserId = () => {
  if (typeof window === "undefined") return "ssr";
  const key = "sync-demo:userId";
  const existing = window.sessionStorage.getItem(key);
  if (existing !== null) return existing;
  const fresh = globalThis.crypto.randomUUID();
  window.sessionStorage.setItem(key, fresh);

  return fresh;
};

const wsUrl =
  typeof window === "undefined"
    ? "ws://localhost/sync/ws"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/sync/ws?userId=${encodeURIComponent(tabUserId())}`;

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

// @absolutejs/sync-pack-presence — durable "who's in this channel" surface,
// alongside the ephemeral presence hub above.
const packPresence = useSyncCollection<PresenceRow>({
  collection: "presence",
  params: { channel: "tasks" },
  url: wsUrl,
});
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  if (typeof window === "undefined") return;
  const userId = tabUserId();
  const heartbeat = () => {
    void fetch("/sync/presence/heartbeat", {
      body: JSON.stringify({
        channel: "tasks",
        name: "vue-tab",
        userId,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  };
  heartbeat();
  heartbeatInterval = setInterval(heartbeat, 5_000);
});
onUnmounted(() => {
  if (heartbeatInterval !== null) clearInterval(heartbeatInterval);
  void fetch("/sync/presence/leave", {
    body: JSON.stringify({ channel: "tasks", userId: tabUserId() }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
});

// @absolutejs/sync-pack-digest — the per-actor cursor + the simulated outbox.
const digestCursors = useSyncCollection<DigestCursor>({
  collection: "digest_cursors",
  url: wsUrl,
});
const digestLog = useSyncCollection<DigestLogEntry>({
  collection: "digest_log",
  url: wsUrl,
});
const digestCursor = computed(() => digestCursors.data.value[0]);
const digestEntries = computed(() =>
  [...digestLog.data.value]
    .sort((first, second) => second.sentAt - first.sentAt)
    .slice(0, 5),
);
const fireDigest = () =>
  void fetch("/sync/digest/fire", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

// @absolutejs/sync-pack-comments — threaded comments on the shared discussion.
const commentsCol = useSyncCollection<CommentWithAuthor>({
  collection: "comments-with-author",
  params: { resourceId: "shared-discussion" },
  url: wsUrl,
});
const commentDraft = ref("");
const orderedComments = computed(() =>
  [...commentsCol.data.value].sort(
    (first, second) => first.createdAt - second.createdAt,
  ),
);
const myUserId = computed(() => tabUserId());
const postComment = (event: Event) => {
  event.preventDefault();
  const body = commentDraft.value.trim();
  if (body.length === 0) return;
  commentDraft.value = "";
  void fetch("/sync/comments/create", {
    body: JSON.stringify({
      body,
      resourceId: "shared-discussion",
      userId: tabUserId(),
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
};
const deleteComment = (commentId: string) =>
  void fetch("/sync/comments/delete", {
    body: JSON.stringify({ commentId, userId: tabUserId() }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

// @absolutejs/sync-pack-counters — three live badges.
const openTasksCol = useSyncCollection<CounterRow>({
  collection: "counter:openTasks",
  url: wsUrl,
});
const doneTasksCol = useSyncCollection<CounterRow>({
  collection: "counter:doneTasks",
  url: wsUrl,
});
const totalCommentsCol = useSyncCollection<CounterRow>({
  collection: "counter:totalComments",
  url: wsUrl,
});
const openTasksCount = computed(() =>
  openTasksCol.data.value[0]?.value !== undefined
    ? String(openTasksCol.data.value[0].value)
    : "…",
);
const doneTasksCount = computed(() =>
  doneTasksCol.data.value[0]?.value !== undefined
    ? String(doneTasksCol.data.value[0].value)
    : "…",
);
const totalCommentsCount = computed(() =>
  totalCommentsCol.data.value[0]?.value !== undefined
    ? String(totalCommentsCol.data.value[0].value)
    : "…",
);

// @absolutejs/sync-pack-notifications — per-actor inbox.
const notificationsCol = useSyncCollection<NotificationRow>({
  collection: "notifications",
  url: wsUrl,
});
const unreadCount = computed(
  () =>
    notificationsCol.data.value.filter((row) => row.readAt === null).length,
);
const recentNotifications = computed(() =>
  [...notificationsCol.data.value]
    .sort((first, second) => second.createdAt - first.createdAt)
    .slice(0, 5),
);
const sendNotification = () =>
  void fetch("/sync/notifications/notify", {
    body: JSON.stringify({
      actorId: tabUserId(),
      body: "Click any inbox item to mark it read.",
      kind: "demo",
      title: `Test notification at ${new Date().toLocaleTimeString()}`,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
const markNotificationRead = (notificationId: string) =>
  fetch("/sync/notifications/markRead", {
    body: JSON.stringify({ notificationId, userId: tabUserId() }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
const markAllNotificationsRead = () =>
  fetch("/sync/notifications/markAllRead", {
    body: JSON.stringify({ userId: tabUserId() }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

// @absolutejs/sync-pack-favorites — per-actor saved tasks via the join.
const favoritesCol = useSyncCollection<FavoriteWithTask>({
  collection: "favorites-with-resource",
  params: { resourceKind: "task" },
  url: wsUrl,
});
const favoritedTaskIds = computed(
  () => new Set(favoritesCol.data.value.map((fav) => fav.resourceId)),
);
const orderedFavorites = computed(() =>
  [...favoritesCol.data.value].sort(
    (first, second) => second.createdAt - first.createdAt,
  ),
);
const toggleFavorite = (taskId: string) =>
  fetch("/sync/favorites/toggle", {
    body: JSON.stringify({
      resourceId: taskId,
      resourceKind: "task",
      userId: tabUserId(),
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

// Conflict-free collaborative editing in one call — the same shared "doc" field
// every framework page edits. The composable merges everyone's edits and
// broadcasts via the engine's auto "doc:merge" mutation.
const { setText: setDocText, text: docText } = useCollaborativeText({
  collection: "doc",
  field: "state",
  id: "shared",
  url: wsUrl,
});
const onDocInput = (event: Event) => {
  const target = event.target;
  if (target instanceof HTMLTextAreaElement) {
    setDocText(target.value);
  }
};
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
          <span
            class="presence-online"
            data-testid="presence-pack-members"
            title="From @absolutejs/sync-pack-presence — collection-based, TTL-cleaned, queryable."
          >
            👥 {{ packPresence.data.value.length }} in channel (pack)
          </span>
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
              :aria-label="
                favoritedTaskIds.has(task.id) ? 'Unfavorite' : 'Favorite'
              "
              :data-testid="`task-fav-${task.id}`"
              type="button"
              :style="{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.1em',
                padding: '0 6px',
              }"
              @click="toggleFavorite(task.id)"
            >
              {{ favoritedTaskIds.has(task.id) ? "★" : "☆" }}
            </button>
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

      <div class="presence-bar" data-testid="counters-pack-row">
        <span class="presence-online" data-testid="counter-openTasks"
          >📝 {{ openTasksCount }} open</span
        >
        <span class="presence-online" data-testid="counter-doneTasks"
          >✓ {{ doneTasksCount }} done</span
        >
        <span class="presence-online" data-testid="counter-totalComments"
          >💬 {{ totalCommentsCount }} comments</span
        >
        <span class="muted">live via @absolutejs/sync-pack-counters</span>
      </div>

      <section class="sync-card">
        <p class="section-desc" data-testid="crdt-label">
          Conflict-free collaborative editing (CRDT) — the same shared field
          every framework page edits. Type here and on <code>/</code> at the
          same time: edits merge and converge, no clobbering.
        </p>
        <textarea
          :value="docText"
          aria-label="Shared document"
          class="crdt-editor"
          data-testid="crdt-editor"
          rows="4"
          @input="onDocInput"
        ></textarea>
      </section>

      <section class="sync-card" data-testid="digest-pack-panel">
        <p class="section-desc">
          Scheduled per-actor digests via
          <code>@absolutejs/sync-pack-digest</code>. Cron fires every 15s; the
          button below triggers it immediately. The cursor is the per-actor
          row from the pack's owned <code>digest_cursors</code> table; the
          outbox below is the host's <code>send</code> adapter writing to an
          in-memory log.
        </p>
        <div class="presence-bar">
          <span class="presence-online" data-testid="digest-cursor">
            📬 Last digest:
            {{
              digestCursor === undefined
                ? "never"
                : new Date(digestCursor.lastSentAt).toLocaleTimeString()
            }}
          </span>
          <button
            class="primary"
            data-testid="digest-fire"
            type="button"
            @click="fireDigest"
          >
            Fire digest now
          </button>
        </div>
        <ul class="task-list" data-testid="digest-log">
          <li v-if="digestEntries.length === 0" class="task-item">
            <span class="muted"
              >No digests sent yet — click "Fire digest now" or wait for the
              15s cron.</span
            >
          </li>
          <li
            v-for="entry in digestEntries"
            :key="entry.id"
            class="task-item"
          >
            <strong>{{ entry.subject }}</strong>
            <span class="muted">
              · to {{ entry.actorId }}@example.invalid ·
              {{ new Date(entry.sentAt).toLocaleTimeString() }}
            </span>
          </li>
        </ul>
      </section>

      <section class="sync-card" data-testid="comments-pack-panel">
        <p class="section-desc">
          Threaded comments via <code>@absolutejs/sync-pack-comments</code> on
          a single shared discussion resource. Open another tab and post —
          every framework page sees every message.
        </p>
        <form class="task-form" @submit="postComment">
          <input
            v-model="commentDraft"
            data-testid="comment-input"
            placeholder="Say something to the shared discussion…"
          />
          <button class="primary" type="submit">Post</button>
        </form>
        <ul class="task-list" data-testid="comments-list">
          <li v-if="orderedComments.length === 0" class="task-item">
            <span class="muted">No comments yet.</span>
          </li>
          <li
            v-for="comment in orderedComments"
            :key="comment.id"
            class="task-item"
          >
            <span>
              <strong>{{ comment.author.displayName }}</strong
              >: {{ comment.body }}
              <span v-if="comment.editedAt !== null" class="muted">
                (edited)</span
              >
              <CommentReactions
                :comment-id="comment.id"
                :ws-url="wsUrl"
                :my-user-id="myUserId"
              />
            </span>
            <button
              v-if="comment.authorId === myUserId"
              :data-testid="`comment-delete-${comment.id}`"
              type="button"
              @click="deleteComment(comment.id)"
            >
              ×
            </button>
          </li>
        </ul>
      </section>

      <section class="sync-card" data-testid="notifications-pack-panel">
        <p class="section-desc">
          Per-actor inbox via
          <code>@absolutejs/sync-pack-notifications</code>. The "Send" button
          POSTs to <code>/sync/notifications/notify</code>; the server-side
          handler stamps <code>systemTrusted: true</code> on the ctx so the
          pack's host-trusted insert accepts it.
        </p>
        <div class="presence-bar">
          <span
            class="presence-online"
            data-testid="notifications-unread-count"
          >
            🔔 {{ unreadCount }} unread
          </span>
          <button
            class="primary"
            data-testid="notifications-send"
            type="button"
            @click="sendNotification"
          >
            Send test notification
          </button>
          <button
            data-testid="notifications-mark-all-read"
            type="button"
            @click="markAllNotificationsRead"
          >
            Mark all read
          </button>
        </div>
        <ul class="task-list" data-testid="notifications-list">
          <li v-if="recentNotifications.length === 0" class="task-item">
            <span class="muted">Inbox empty.</span>
          </li>
          <li
            v-for="notification in recentNotifications"
            :key="notification.id"
            :class="
              notification.readAt === null ? 'task-item' : 'task-item done'
            "
          >
            <span>
              <strong>{{ notification.title }}</strong>
              <span class="muted">
                ·
                {{ new Date(notification.createdAt).toLocaleTimeString() }}
              </span>
            </span>
            <button
              v-if="notification.readAt === null"
              :data-testid="`notification-mark-read-${notification.id}`"
              type="button"
              @click="markNotificationRead(notification.id)"
            >
              ✓
            </button>
          </li>
        </ul>
      </section>

      <section class="sync-card" data-testid="favorites-pack-panel">
        <p class="section-desc">
          Per-actor favorites via
          <code>@absolutejs/sync-pack-favorites</code>. Click ☆/★ on any task
          above to toggle. The panel subscribes to
          <code>favorites-with-resource</code>, so each row arrives
          pre-joined with the host's task row.
        </p>
        <ul class="task-list" data-testid="favorites-list">
          <li v-if="orderedFavorites.length === 0" class="task-item">
            <span class="muted">
              No favorites yet — click a ☆ above to add one.
            </span>
          </li>
          <li
            v-for="favorite in orderedFavorites"
            :key="favorite.id"
            :class="favorite.resource.done ? 'task-item done' : 'task-item'"
          >
            <span>
              <strong>★</strong>
              {{ favorite.resource.title }}
            </span>
            <button
              :data-testid="`favorite-remove-${favorite.resourceId}`"
              type="button"
              @click="toggleFavorite(favorite.resourceId)"
            >
              ×
            </button>
          </li>
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
