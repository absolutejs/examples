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
  // 0.2+: comments-with-author join shape.
  type CommentWithAuthor = CommentRow & {
    author: { id: string; displayName: string };
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
  }
  onDestroy(() => {
    if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
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
              <strong>{comment.author.displayName}</strong>: {comment.body}
              {#if comment.editedAt !== null}
                <span class="muted"> (edited)</span>
              {/if}
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
