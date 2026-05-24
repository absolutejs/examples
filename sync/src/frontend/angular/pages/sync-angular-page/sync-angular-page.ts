import { CommonModule } from "@angular/common";
import { Component, type OnDestroy, type OnInit, signal } from "@angular/core";
import {
  createSyncSubscriber,
  type SyncSubscriber,
} from "@absolutejs/sync/client";

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

@Component({
  imports: [CommonModule],
  selector: "sync-angular-page",
  standalone: true,
  templateUrl: "./sync-angular-page.html",
})
export class SyncAngularPageComponent implements OnInit, OnDestroy {
  count = signal(0);
  connected = signal(false);
  private subscriber?: SyncSubscriber;

  ngOnInit() {
    // Runs during SSR too; the live subscription is browser-only.
    if (typeof window === "undefined") {
      return;
    }

    void fetch("/api/state")
      .then((response) => response.json())
      .then((data: { count: number }) => this.count.set(data.count));

    this.subscriber = createSyncSubscriber({
      onError: () => this.connected.set(false),
      onEvent: (event) => {
        const payload = event.payload as { count?: number } | undefined;
        if (payload?.count !== undefined) {
          this.count.set(payload.count);
        }
      },
      onOpen: () => this.connected.set(true),
      topics: ["counter"],
      url: "/sync",
    });
  }

  ngOnDestroy() {
    this.subscriber?.close();
  }

  bump() {
    void fetch("/api/bump", { method: "POST" });
  }

  reset() {
    void fetch("/api/reset", { method: "POST" });
  }
}

export default SyncAngularPageComponent;
export const factory = () => new SyncAngularPageComponent();
