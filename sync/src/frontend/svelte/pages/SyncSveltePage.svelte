<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    createCollaborativeTextStore,
    createSyncCollectionStore,
  } from "@absolutejs/sync/svelte";
  import {
    createPresence,
    indexedDbCollectionCache,
  } from "@absolutejs/sync/client";
  import type { PresenceClient, PresenceMember } from "@absolutejs/sync/client";
  import Nav from "../components/Nav.svelte";
  import CommentReactions from "../components/CommentReactions.svelte";

  type Task = {
    id: string;
    title: string;
    done: boolean;
    createdAt: number;
  };

  type Presence = { name: string; typing: boolean };

  // Pack-related row shapes (must match the server registration).
  type PresenceRow = {
    id: string;
    channel: string;
    actorId: string;
    state: {
      name: string;
      typing?: boolean;
      typingExpiresAt?: number | null;
    };
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
  // 0.2+: comments-with-author join shape.
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
    pinnedAt: number | null;
    resource: Task;
  };

  let { cssPath = undefined }: { cssPath?: string } = $props();

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
  // A real Svelte store: `$collection` is the live { data, status, error }.
  const collection = createSyncCollectionStore<Task>({
    cache: taskCache,
    collection: "tasks",
    url: wsUrl,
  });
  onDestroy(() => collection.destroy());

  let title = $state("");

  const tasks = $derived(
    [...$collection.data].sort((a, b) => a.createdAt - b.createdAt),
  );
  const doneCount = $derived(tasks.filter((task) => task.done).length);

  // Presence: who's online + who's typing in the shared "tasks" room.
  let members = $state<PresenceMember<Presence>[]>([]);
  let selfId = $state<string | undefined>(undefined);
  const presenceName = `User-${Math.random().toString(36).slice(2, 6)}`;
  let presence: PresenceClient<Presence> | null = null;
  if (typeof window !== "undefined") {
    presence = createPresence<Presence>({
      room: "tasks",
      state: { name: presenceName, typing: false },
      url: wsUrl,
    });
    selfId = presence.id;
    presence.subscribe((next) => {
      members = next;
    });
  }
  onDestroy(() => presence?.close());
  $effect(() => {
    presence?.set({ name: presenceName, typing: title.trim().length > 0 });
  });

  const online = $derived(members.length);
  const typing = $derived(
    members
      .filter((member) => member.id !== selfId && member.state.typing)
      .map((member) => member.state.name),
  );

  const add = (event: Event) => {
    event.preventDefault();
    const value = title.trim();
    if (!value) {
      return;
    }
    title = "";
    const id = globalThis.crypto.randomUUID();
    void collection.mutate({
      args: { id, title: value },
      name: "addTask",
      optimistic: (draft) =>
        draft.set({ createdAt: Date.now(), done: false, id, title: value }),
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

  // @absolutejs/sync-pack-presence — durable membership collection.
  const packPresence = createSyncCollectionStore<PresenceRow>({
    collection: "presence",
    params: { channel: "tasks" },
    url: wsUrl,
  });
  onDestroy(() => packPresence.destroy());
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  // Tick every second so packTypingNames re-evaluates as state.typingExpiresAt
  // naturally ages out (sync-pack-presence 0.3).
  let packTypingTick = $state(0);
  let packTypingInterval: ReturnType<typeof setInterval> | null = null;
  if (typeof window !== "undefined") {
    const userId = tabUserId();
    const heartbeat = () => {
      void fetch("/sync/presence/heartbeat", {
        body: JSON.stringify({
          channel: "tasks",
          name: "svelte-tab",
          userId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    };
    heartbeat();
    heartbeatTimer = setInterval(heartbeat, 5_000);
    packTypingInterval = setInterval(() => {
      packTypingTick += 1;
    }, 1_000);
  }
  const setPackTyping = (typing: boolean) =>
    fetch("/sync/presence/typing", {
      body: JSON.stringify({ channel: "tasks", typing, userId: tabUserId() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  $effect(() => void setPackTyping(title.trim().length > 0));
  const packTypingNames = $derived(
    (() => {
      void packTypingTick;
      const now = Date.now();
      const myUserId = tabUserId();
      return $packPresence.data
        .filter((row) => {
          if (row.actorId === myUserId) return false;
          if (row.state.typing !== true) return false;
          const expiresAt = row.state.typingExpiresAt;
          return (
            expiresAt !== null &&
            expiresAt !== undefined &&
            expiresAt > now
          );
        })
        .map((row) => row.state.name);
    })(),
  );
  onDestroy(() => {
    if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
    if (packTypingInterval !== null) clearInterval(packTypingInterval);
    if (typeof window === "undefined") return;
    void fetch("/sync/presence/leave", {
      body: JSON.stringify({ channel: "tasks", userId: tabUserId() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  // @absolutejs/sync-pack-digest — cursor + outbox + manual-fire button.
  const digestCursors = createSyncCollectionStore<DigestCursor>({
    collection: "digest_cursors",
    url: wsUrl,
  });
  onDestroy(() => digestCursors.destroy());
  const digestLog = createSyncCollectionStore<DigestLogEntry>({
    collection: "digest_log",
    url: wsUrl,
  });
  onDestroy(() => digestLog.destroy());
  const digestCursor = $derived($digestCursors.data[0]);
  const digestEntries = $derived(
    [...$digestLog.data]
      .sort((first, second) => second.sentAt - first.sentAt)
      .slice(0, 5),
  );
  const fireDigest = () =>
    void fetch("/sync/digest/fire", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

  // @absolutejs/sync-pack-comments — threaded comments on the shared discussion.
  const commentsStore = createSyncCollectionStore<CommentWithAuthor>({
    collection: "comments-with-author",
    params: { resourceId: "shared-discussion" },
    url: wsUrl,
  });
  onDestroy(() => commentsStore.destroy());
  let commentDraft = $state("");
  const orderedComments = $derived(
    [...$commentsStore.data].sort(
      (first, second) => first.createdAt - second.createdAt,
    ),
  );
  const myUserId = $derived(tabUserId());
  const postComment = (event: Event) => {
    event.preventDefault();
    const body = commentDraft.trim();
    if (body.length === 0) return;
    commentDraft = "";
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
  const openTasksStore = createSyncCollectionStore<CounterRow>({
    collection: "counter:openTasks",
    url: wsUrl,
  });
  onDestroy(() => openTasksStore.destroy());
  const doneTasksStore = createSyncCollectionStore<CounterRow>({
    collection: "counter:doneTasks",
    url: wsUrl,
  });
  onDestroy(() => doneTasksStore.destroy());
  const totalCommentsStore = createSyncCollectionStore<CounterRow>({
    collection: "counter:totalComments",
    url: wsUrl,
  });
  onDestroy(() => totalCommentsStore.destroy());
  const openTasksCount = $derived($openTasksStore.data[0]?.value);
  const doneTasksCount = $derived($doneTasksStore.data[0]?.value);
  const totalCommentsCount = $derived($totalCommentsStore.data[0]?.value);

  // @absolutejs/sync-pack-notifications — per-actor inbox with kind tabs.
  // Client-side filter (server-side params: { kind } covered by
  // pack-internal tests).
  const NOTIFICATION_KINDS = ["mention", "reply", "system"] as const;
  type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
  let notificationsKindFilter = $state<NotificationKind | null>(null);
  const notificationsStore = createSyncCollectionStore<NotificationRow>({
    collection: "notifications",
    url: wsUrl,
  });
  const filteredNotifications = $derived(
    notificationsKindFilter === null
      ? $notificationsStore.data
      : $notificationsStore.data.filter(
          (notification) => notification.kind === notificationsKindFilter,
        ),
  );
  onDestroy(() => notificationsStore.destroy());
  const unreadCount = $derived(
    filteredNotifications.filter((row) => row.readAt === null).length,
  );
  const recentNotifications = $derived(
    [...filteredNotifications]
      .sort((first, second) => second.createdAt - first.createdAt)
      .slice(0, 5),
  );
  const sendNotification = () => {
    const kind: NotificationKind = notificationsKindFilter ?? "mention";
    void fetch("/sync/notifications/notify", {
      body: JSON.stringify({
        actorId: tabUserId(),
        body: "Click any inbox item to mark it read.",
        kind,
        title: `Test ${kind} at ${new Date().toLocaleTimeString()}`,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  };
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
  const favoritesStore = createSyncCollectionStore<FavoriteWithTask>({
    collection: "favorites-with-resource",
    params: { resourceKind: "task" },
    url: wsUrl,
  });
  onDestroy(() => favoritesStore.destroy());
  const favoritedTaskIds = $derived(
    new Set($favoritesStore.data.map((fav) => fav.resourceId)),
  );
  const orderedFavorites = $derived(
    [...$favoritesStore.data].sort((first, second) => {
      if (first.pinnedAt !== null && second.pinnedAt === null) return -1;
      if (first.pinnedAt === null && second.pinnedAt !== null) return 1;
      if (first.pinnedAt !== null && second.pinnedAt !== null) {
        return second.pinnedAt - first.pinnedAt;
      }
      return second.createdAt - first.createdAt;
    }),
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
  const toggleFavoritePin = (taskId: string) =>
    fetch("/sync/favorites/togglePin", {
      body: JSON.stringify({
        resourceId: taskId,
        resourceKind: "task",
        userId: tabUserId(),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

  // Conflict-free collaborative editing — the same shared "doc" field every
  // framework page edits. `$docStore` is the live { text, status }.
  const docStore = createCollaborativeTextStore({
    collection: "doc",
    field: "state",
    id: "shared",
    url: wsUrl,
  });
  onDestroy(() => docStore.destroy());
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

    <p class="section-desc">
      This page is the developer-facing demo. <strong>Devtools ↗</strong> in the
      nav opens the operator surface — live engine inspector,
      <strong>point-in-time replay</strong>
      (<code>engine.replayTo</code>, 1.22; clickable Replay panel, 1.23), and
      the <strong>tenant migration primitives</strong>
      (<code>engine.fence</code> / <code>exportSnapshot</code> /
      <code>importSnapshot</code>, 1.24).
    </p>

    <div class="presence-bar" data-testid="counters-pack-row">
      <span class="presence-online" data-testid="counter-openTasks"
        >📝 {openTasksCount ?? "…"} open</span
      >
      <span class="presence-online" data-testid="counter-doneTasks"
        >✓ {doneTasksCount ?? "…"} done</span
      >
      <span class="presence-online" data-testid="counter-totalComments"
        >💬 {totalCommentsCount ?? "…"} comments</span
      >
      <span class="muted" style="font-size: 0.85em;">
        live via <code>@absolutejs/sync-pack-counters</code>
      </span>
    </div>

    <section class="sync-card">
      <div class="sync-bar">
        <div class="sync-status">
          <span class={$collection.status === "ready" ? "dot dot-live" : "dot"}
          ></span>
          {$collection.status === "ready" ? "Live — /sync/ws" : "Connecting…"}
        </div>
        <span class="sync-stat">{doneCount}/{tasks.length} done</span>
      </div>

      <div class="presence-bar">
        <span class="presence-online" data-testid="presence-online"
          >{online} online</span
        >
        <span
          class="presence-online"
          data-testid="presence-pack-members"
          title="From @absolutejs/sync-pack-presence — collection-based, TTL-cleaned, queryable."
        >
          👥 {$packPresence.data.length} in channel (pack)
        </span>
        <span class="presence-typing"
          >{typing.length > 0 ? `${typing.join(", ")} typing…` : ""}</span
        >
        <span
          class="presence-typing"
          data-testid="presence-pack-typing"
          title="From @absolutejs/sync-pack-presence 0.3 — typing state patched onto the per-actor presence row, with a TTL inside state.typingExpiresAt."
          >{packTypingNames.length > 0
            ? `✍️ ${packTypingNames.join(", ")} typing (pack)…`
            : ""}</span
        >
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
              aria-label={favoritedTaskIds.has(task.id)
                ? "Unfavorite"
                : "Favorite"}
              data-testid={`task-fav-${task.id}`}
              onclick={() => toggleFavorite(task.id)}
              style="background: transparent; border: none; cursor: pointer; font-size: 1.1em; padding: 0 6px;"
              type="button"
              >{favoritedTaskIds.has(task.id) ? "★" : "☆"}</button
            >
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

    <section class="sync-card">
      <p class="section-desc" data-testid="crdt-label">
        Conflict-free collaborative editing (CRDT) — the same shared field every
        framework page edits. Type here and on <code>/</code> at the same time:
        edits merge and converge, no clobbering.
      </p>
      <textarea
        aria-label="Shared document"
        class="crdt-editor"
        data-testid="crdt-editor"
        oninput={(event) => docStore.setText(event.currentTarget.value)}
        rows="4"
        value={$docStore.text}
      ></textarea>
    </section>

    <section class="sync-card" data-testid="digest-pack-panel">
      <p class="section-desc">
        Scheduled per-actor digests via <code>@absolutejs/sync-pack-digest</code>.
        Cron fires every 15s; the button below triggers it immediately. The
        cursor is the per-actor row from the pack's owned
        <code>digest_cursors</code> table.
      </p>
      <div class="presence-bar">
        <span class="presence-online" data-testid="digest-cursor">
          📬 Last digest: {digestCursor === undefined
            ? "never"
            : new Date(digestCursor.lastSentAt).toLocaleTimeString()}
        </span>
        <button
          class="primary"
          data-testid="digest-fire"
          onclick={fireDigest}
          type="button"
        >
          Fire digest now
        </button>
      </div>
      <ul class="task-list" data-testid="digest-log">
        {#if digestEntries.length === 0}
          <li class="task-item">
            <span class="muted">
              No digests sent yet — click "Fire digest now" or wait for the 15s
              cron.
            </span>
          </li>
        {/if}
        {#each digestEntries as entry (entry.id)}
          <li class="task-item">
            <strong>{entry.subject}</strong>
            <span class="muted">
              · to {entry.actorId}@example.invalid ·
              {new Date(entry.sentAt).toLocaleTimeString()}
            </span>
          </li>
        {/each}
      </ul>
    </section>

    <section class="sync-card" data-testid="comments-pack-panel">
      <p class="section-desc">
        Threaded comments via <code>@absolutejs/sync-pack-comments</code> on a
        single shared discussion resource. Open another tab and post — every
        framework page sees every message.
      </p>
      <form class="task-form" onsubmit={postComment}>
        <input
          bind:value={commentDraft}
          data-testid="comment-input"
          placeholder="Say something to the shared discussion…"
        />
        <button class="primary" type="submit">Post</button>
      </form>
      <ul class="task-list" data-testid="comments-list">
        {#if orderedComments.length === 0}
          <li class="task-item">
            <span class="muted">No comments yet.</span>
          </li>
        {/if}
        {#each orderedComments as comment (comment.id)}
          <li class="task-item">
            <span>
              <strong>{comment.author.displayName}</strong>
              <span
                class="muted"
                data-testid={`comment-slug-${comment.id}`}
                style="font-size: 0.85em; margin-left: 4px;"
                title="Mention this author by typing @slug in a comment — @absolutejs/sync-pack-mentions fires a notification to them."
                >@{comment.authorId.slice(0, 6)}</span
              >: {comment.body}
              {#if comment.editedAt !== null}
                <span class="muted"> (edited)</span>
              {/if}
              <CommentReactions
                commentId={comment.id}
                wsUrl={wsUrl}
                myUserId={myUserId}
              />
            </span>
            {#if comment.authorId === myUserId}
              <button
                data-testid={`comment-delete-${comment.id}`}
                onclick={() => deleteComment(comment.id)}
                type="button">×</button
              >
            {/if}
          </li>
        {/each}
      </ul>
    </section>

    <section class="sync-card" data-testid="notifications-pack-panel">
      <p class="section-desc">
        Per-actor inbox via <code>@absolutejs/sync-pack-notifications</code>.
        Tabs filter the live collection by <code>kind</code> client-side; the
        pack's own <code>kindFilter</code> param is covered by its tests.
      </p>
      <div class="presence-bar" data-testid="notifications-kind-tabs">
        {#each ["All", ...NOTIFICATION_KINDS] as label (label)}
          {@const isAll = label === "All"}
          {@const active =
            (isAll && notificationsKindFilter === null) ||
            label === notificationsKindFilter}
          <button
            data-testid={`notifications-tab-${isAll ? "all" : label}`}
            onclick={() =>
              (notificationsKindFilter = isAll
                ? null
                : (label as NotificationKind))}
            style="background: {active
              ? 'rgba(99,102,241,0.2)'
              : 'transparent'}; border: 1px solid {active
              ? '#6366f1'
              : 'rgba(255,255,255,0.15)'}; border-radius: 12px; cursor: pointer; margin-right: 4px; padding: 2px 10px; text-transform: capitalize;"
            type="button">{label}</button
          >
        {/each}
      </div>
      <div class="presence-bar">
        <span class="presence-online" data-testid="notifications-unread-count"
          >🔔 {unreadCount} unread{notificationsKindFilter !== null
            ? ` (${notificationsKindFilter})`
            : ""}</span
        >
        <button
          class="primary"
          data-testid="notifications-send"
          onclick={sendNotification}
          type="button">Send {notificationsKindFilter ?? "mention"}</button
        >
        <button
          data-testid="notifications-mark-all-read"
          onclick={markAllNotificationsRead}
          type="button">Mark all read</button
        >
      </div>
      <ul class="task-list" data-testid="notifications-list">
        {#if recentNotifications.length === 0}
          <li class="task-item"><span class="muted">Inbox empty.</span></li>
        {/if}
        {#each recentNotifications as notification (notification.id)}
          <li
            class={notification.readAt === null
              ? "task-item"
              : "task-item done"}
          >
            <span>
              <strong>{notification.title}</strong>
              <span class="muted">
                · {new Date(notification.createdAt).toLocaleTimeString()}
              </span>
            </span>
            {#if notification.readAt === null}
              <button
                data-testid={`notification-mark-read-${notification.id}`}
                onclick={() => markNotificationRead(notification.id)}
                type="button">✓</button
              >
            {/if}
          </li>
        {/each}
      </ul>
    </section>

    <section class="sync-card" data-testid="favorites-pack-panel">
      <p class="section-desc">
        Per-actor favorites via <code>@absolutejs/sync-pack-favorites</code>
        — click ☆/★ on any task above. Click 📌 to pin; pinned favorites
        sort to the top across every framework page.
      </p>
      <ul class="task-list" data-testid="favorites-list">
        {#if orderedFavorites.length === 0}
          <li class="task-item">
            <span class="muted">No favorites yet — click a ☆ above.</span>
          </li>
        {/if}
        {#each orderedFavorites as favorite (favorite.id)}
          <li
            class={favorite.resource.done ? "task-item done" : "task-item"}
            data-pinned={favorite.pinnedAt !== null ? "true" : "false"}
          >
            <span>
              <strong>{favorite.pinnedAt !== null ? "📌" : "★"}</strong>
              {favorite.resource.title}
            </span>
            <button
              aria-label={favorite.pinnedAt !== null ? "Unpin" : "Pin"}
              data-testid={`favorite-pin-${favorite.resourceId}`}
              onclick={() => toggleFavoritePin(favorite.resourceId)}
              style="background: transparent; border: none; cursor: pointer; padding: 0 6px;"
              type="button"
              >{favorite.pinnedAt !== null ? "📌" : "📍"}</button
            >
            <button
              data-testid={`favorite-remove-${favorite.resourceId}`}
              onclick={() => toggleFavorite(favorite.resourceId)}
              type="button">×</button
            >
          </li>
        {/each}
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
