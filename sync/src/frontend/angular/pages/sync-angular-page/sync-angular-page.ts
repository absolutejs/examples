import {
  Component,
  computed,
  inject,
  type OnDestroy,
  signal,
} from "@angular/core";
import { SyncCollectionService } from "@absolutejs/sync/angular";
import {
  createPresence,
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

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

const wsUrl = () =>
  typeof window === "undefined"
    ? "ws://localhost/sync/ws"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/sync/ws`;

// A throwaway display name, generated on the client only (never during SSR, so
// there's no hydration mismatch).
const randomName = () => `User-${globalThis.crypto.randomUUID().split("-")[0]}`;

@Component({
  imports: [],
  selector: "sync-angular-page",
  standalone: true,
  templateUrl: "./sync-angular-page.html",
})
export class SyncAngularPageComponent implements OnDestroy {
  // Inject the service and connect; it returns signals fed by the WS diff
  // stream. The socket only opens in the browser, so SSR stays inert.
  private sync = inject(SyncCollectionService);
  private handle = this.sync.connect<Task>({
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
    }
  }

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
    void this.handle.mutate({
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
}

export default SyncAngularPageComponent;
export const factory = () => SyncAngularPageComponent;
