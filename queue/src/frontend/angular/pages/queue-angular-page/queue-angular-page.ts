import { CommonModule } from "@angular/common";
import { Component, type OnDestroy, type OnInit, signal } from "@angular/core";

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

type Job = {
  attempts: number;
  createdAt: number;
  id: string;
  label: string;
  status: string;
};

type JobsResponse = {
  counts: Record<string, number>;
  jobs: Job[];
};

const STATUS_LABEL: Record<string, string> = {
  canceled: "Canceled",
  claimed: "Running",
  dead: "Failed",
  done: "Done",
  pending: "Queued",
};

const STAT_ORDER: Array<{ label: string; status: string }> = [
  { label: "Queued", status: "pending" },
  { label: "Running", status: "claimed" },
  { label: "Done", status: "done" },
  { label: "Failed", status: "dead" },
];

@Component({
  imports: [CommonModule],
  selector: "queue-angular-page",
  standalone: true,
  templateUrl: "./queue-angular-page.html",
})
export class QueueAngularPageComponent implements OnInit, OnDestroy {
  jobs = signal<Job[]>([]);
  counts = signal<Record<string, number>>({});
  readonly statOrder = STAT_ORDER;
  readonly statusLabel = STATUS_LABEL;
  private intervalId?: ReturnType<typeof setInterval>;

  ngOnInit() {
    // Runs during SSR too; the polling loop is browser-only.
    if (typeof window === "undefined") {
      return;
    }

    const refresh = () =>
      fetch("/api/jobs")
        .then((response) => response.json())
        .then((data: JobsResponse) => {
          this.jobs.set(data.jobs);
          this.counts.set(data.counts);
        });

    void refresh();
    this.intervalId = setInterval(refresh, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
    }
  }

  enqueue() {
    void fetch("/api/enqueue", { method: "POST" });
  }
}

export default QueueAngularPageComponent;
export const factory = () => new QueueAngularPageComponent();
