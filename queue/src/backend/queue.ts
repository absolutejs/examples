import { Elysia } from "elysia";
import {
  createInMemoryJobStore,
  createJobRegistry,
  defineJobs,
  queue,
  t,
} from "@absolutejs/queue";

// One job kind: payload types are inferred from this schema and validated at
// enqueue + dequeue. A real app registers many kinds here.
const jobs = defineJobs({
  "demo.task": t.Object({ label: t.String() }),
});

const store = createInMemoryJobStore(jobs);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The handler simulates real work: a short delay, with an occasional transient
// failure on the first try so the queue's automatic retry is visible.
const registry = createJobRegistry(jobs).on(
  "demo.task",
  async (_payload, { attempts }) => {
    await sleep(1200 + Math.random() * 1800);
    if (attempts < 2 && Math.random() < 0.3) {
      throw new Error("Transient failure — the queue will retry");
    }
  },
);

let counter = 0;

export const queuePlugin = new Elysia()
  // Mounts the in-process worker (auto-starts) + decorates the context with
  // `queue.enqueue`.
  .use(queue({ concurrency: 2, registry, store }))
  .post("/api/enqueue", async ({ queue: jobQueue }) => {
    counter += 1;
    const id = await jobQueue.enqueue("demo.task", {
      label: `Task #${counter}`,
    });

    return { id };
  })
  .get("/api/jobs", async () => {
    const list = store.list ? await store.list({ limit: 30 }) : [];
    const counts = store.countByStatus ? await store.countByStatus() : {};

    return {
      counts,
      jobs: list
        .map((job) => ({
          attempts: job.attempts,
          createdAt: job.createdAt,
          id: job.id,
          label: (job.payload as { label?: string }).label ?? String(job.kind),
          status: job.status,
        }))
        .sort((left, right) => right.createdAt - left.createdAt),
    };
  });
