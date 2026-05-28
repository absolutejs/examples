import {
  Component,
  computed,
  inject,
  type OnDestroy,
  signal,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { SyncCollectionService } from "@absolutejs/sync/angular";
import {
  createPresence,
  indexedDbCollectionCache,
  type PresenceClient,
  type PresenceMember,
} from "@absolutejs/sync/client";

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
type FavoriteWithTask = {
  id: string;
  actorId: string;
  resourceKind: string;
  resourceId: string;
  createdAt: number;
  resource: Task;
};

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

const tabUserId = () => {
  if (typeof window === "undefined") return "ssr";
  const key = "sync-demo:userId";
  const existing = window.sessionStorage.getItem(key);
  if (existing !== null) return existing;
  const fresh = globalThis.crypto.randomUUID();
  window.sessionStorage.setItem(key, fresh);

  return fresh;
};

const wsUrl = () =>
  typeof window === "undefined"
    ? "ws://localhost/sync/ws"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/sync/ws?userId=${encodeURIComponent(tabUserId())}`;

// A throwaway display name, generated on the client only (never during SSR, so
// there's no hydration mismatch).
const randomName = () => `User-${globalThis.crypto.randomUUID().split("-")[0]}`;

// Local-first: persist confirmed rows in IndexedDB for instant reads on reload
// and offline; the socket resumes from the cached version.
const taskCache = indexedDbCollectionCache<Task>({ key: "tasks" });

@Component({
  imports: [DatePipe],
  selector: "sync-angular-page",
  standalone: true,
  templateUrl: "./sync-angular-page.html",
})
export class SyncAngularPageComponent implements OnDestroy {
  // Inject the service and connect; it returns signals fed by the WS diff
  // stream. The socket only opens in the browser, so SSR stays inert.
  private sync = inject(SyncCollectionService);
  private handle = this.sync.connect<Task>({
    cache: taskCache,
    collection: "tasks",
    url: wsUrl(),
  });

  // Presence: who's online + who's typing in the shared "tasks" room.
  private presenceName = "";
  private presence: PresenceClient<Presence> | null = null;
  members = signal<PresenceMember<Presence>[]>([]);
  selfId = signal<string | undefined>(undefined);

  constructor() {
    if (typeof window !== "undefined") {
      this.presenceName = randomName();
      this.presence = createPresence<Presence>({
        room: "tasks",
        state: { name: this.presenceName, typing: false },
        url: wsUrl(),
      });
      this.selfId.set(this.presence.id);
      this.presence.subscribe((next) => this.members.set(next));

      // sync-pack-presence heartbeat. Keeps the actor's row alive in the
      // pack's owned `presence` collection.
      const userId = tabUserId();
      const heartbeat = () => {
        void fetch("/sync/presence/heartbeat", {
          body: JSON.stringify({
            channel: "tasks",
            name: "angular-tab",
            userId,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
      };
      heartbeat();
      this.heartbeatTimer = setInterval(heartbeat, 5_000);
    }
  }

  // @absolutejs/sync-pack-presence — durable membership collection.
  private packPresenceHandle = this.sync.connect<PresenceRow>({
    collection: "presence",
    params: { channel: "tasks" },
    url: wsUrl(),
  });
  packPresenceCount = computed(() => this.packPresenceHandle.data().length);
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // @absolutejs/sync-pack-digest — cursor + outbox + manual fire button.
  private digestCursorsHandle = this.sync.connect<DigestCursor>({
    collection: "digest_cursors",
    url: wsUrl(),
  });
  digestCursor = computed(() => this.digestCursorsHandle.data()[0]);
  private digestLogHandle = this.sync.connect<DigestLogEntry>({
    collection: "digest_log",
    url: wsUrl(),
  });
  digestEntries = computed(() =>
    [...this.digestLogHandle.data()]
      .sort((first, second) => second.sentAt - first.sentAt)
      .slice(0, 5),
  );
  fireDigest() {
    void fetch("/sync/digest/fire", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }

  // @absolutejs/sync-pack-comments — threaded comments on a shared resource.
  private commentsHandle = this.sync.connect<CommentWithAuthor>({
    collection: "comments-with-author",
    params: { resourceId: "shared-discussion" },
    url: wsUrl(),
  });
  orderedComments = computed(() =>
    [...this.commentsHandle.data()].sort(
      (first, second) => first.createdAt - second.createdAt,
    ),
  );
  commentDraft = signal("");
  myUserId = signal(tabUserId());
  setCommentDraft(event: Event) {
    const { target } = event;
    if (target instanceof HTMLInputElement) {
      this.commentDraft.set(target.value);
    }
  }
  postComment(event: Event) {
    event.preventDefault();
    const body = this.commentDraft().trim();
    if (body.length === 0) return;
    this.commentDraft.set("");
    void fetch("/sync/comments/create", {
      body: JSON.stringify({
        body,
        resourceId: "shared-discussion",
        userId: tabUserId(),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }
  deleteComment(commentId: string) {
    void fetch("/sync/comments/delete", {
      body: JSON.stringify({ commentId, userId: tabUserId() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }

  // @absolutejs/sync-pack-notifications — per-actor inbox.
  private notificationsHandle = this.sync.connect<NotificationRow>({
    collection: "notifications",
    url: wsUrl(),
  });
  unreadCount = computed(
    () =>
      this.notificationsHandle.data().filter((row) => row.readAt === null)
        .length,
  );
  recentNotifications = computed(() =>
    [...this.notificationsHandle.data()]
      .sort((first, second) => second.createdAt - first.createdAt)
      .slice(0, 5),
  );
  sendNotification() {
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
  }
  markNotificationRead(notificationId: string) {
    void fetch("/sync/notifications/markRead", {
      body: JSON.stringify({ notificationId, userId: tabUserId() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }
  markAllNotificationsRead() {
    void fetch("/sync/notifications/markAllRead", {
      body: JSON.stringify({ userId: tabUserId() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }

  // @absolutejs/sync-pack-favorites — per-actor saved tasks.
  private favoritesHandle = this.sync.connect<FavoriteWithTask>({
    collection: "favorites-with-resource",
    params: { resourceKind: "task" },
    url: wsUrl(),
  });
  favoritedTaskIds = computed(
    () => new Set(this.favoritesHandle.data().map((fav) => fav.resourceId)),
  );
  orderedFavorites = computed(() =>
    [...this.favoritesHandle.data()].sort(
      (first, second) => second.createdAt - first.createdAt,
    ),
  );
  toggleFavorite(taskId: string) {
    void fetch("/sync/favorites/toggle", {
      body: JSON.stringify({
        resourceId: taskId,
        resourceKind: "task",
        userId: tabUserId(),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }

  // Conflict-free collaborative editing — the same shared "doc" field every
  // framework page edits. Returns text/status signals + setText.
  private doc = this.sync.collaborativeText({
    collection: "doc",
    field: "state",
    id: "shared",
    url: wsUrl(),
  });
  docText = this.doc.text;

  status = this.handle.status;
  title = signal("");
  tasks = computed(() =>
    [...this.handle.data()].sort(
      (first, second) => first.createdAt - second.createdAt,
    ),
  );
  doneCount = computed(() => this.tasks().filter((task) => task.done).length);
  online = computed(() => this.members().length);
  typing = computed(() =>
    this.members()
      .filter((member) => member.id !== this.selfId() && member.state.typing)
      .map((member) => member.state.name),
  );

  ngOnDestroy() {
    this.presence?.close();
    if (this.heartbeatTimer !== null) clearInterval(this.heartbeatTimer);
    if (typeof window !== "undefined") {
      void fetch("/sync/presence/leave", {
        body: JSON.stringify({ channel: "tasks", userId: tabUserId() }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    }
  }

  setTitle(event: Event) {
    const { target } = event;
    if (target instanceof HTMLInputElement) {
      this.title.set(target.value);
      this.presence?.set({
        name: this.presenceName,
        typing: target.value.trim().length > 0,
      });
    }
  }

  add(event: Event) {
    event.preventDefault();
    const value = this.title().trim();
    if (!value) {
      return;
    }
    this.title.set("");
    const id = globalThis.crypto.randomUUID();
    void this.handle.mutate({
      args: { id, title: value },
      name: "addTask",
      optimistic: (draft) =>
        draft.set({ createdAt: Date.now(), done: false, id, title: value }),
    });
  }

  toggle(task: Task) {
    void this.handle.mutate({
      args: { id: task.id },
      name: "toggleTask",
      optimistic: (draft) => draft.set({ ...task, done: !task.done }),
    });
  }

  remove(task: Task) {
    void this.handle.mutate({
      args: { id: task.id },
      name: "removeTask",
      optimistic: (draft) => draft.delete(task.id),
    });
  }

  setDoc(event: Event) {
    const { target } = event;
    if (target instanceof HTMLTextAreaElement) {
      this.doc.setText(target.value);
    }
  }
}

export default SyncAngularPageComponent;
export const factory = () => SyncAngularPageComponent;
