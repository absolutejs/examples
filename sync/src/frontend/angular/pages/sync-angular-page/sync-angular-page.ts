import { Component, computed, inject, signal } from "@angular/core";
import { SyncCollectionService } from "@absolutejs/sync/angular";

type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

const wsUrl = () =>
  typeof window === "undefined"
    ? "ws://localhost/sync/ws"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/sync/ws`;

@Component({
  imports: [],
  selector: "sync-angular-page",
  standalone: true,
  templateUrl: "./sync-angular-page.html",
})
export class SyncAngularPageComponent {
  // Inject the service and connect; it returns signals fed by the WS diff
  // stream. The socket only opens in the browser, so SSR stays inert.
  private sync = inject(SyncCollectionService);
  private handle = this.sync.connect<Task>({
    collection: "tasks",
    url: wsUrl(),
  });

  status = this.handle.status;
  title = signal("");
  tasks = computed(() =>
    [...this.handle.data()].sort(
      (first, second) => first.createdAt - second.createdAt,
    ),
  );
  doneCount = computed(() => this.tasks().filter((task) => task.done).length);

  setTitle(event: Event) {
    const { target } = event;
    if (target instanceof HTMLInputElement) {
      this.title.set(target.value);
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
