import { Elysia } from "elysia";
import { createReactiveHub, sync } from "@absolutejs/sync";

// The one topic this demo broadcasts on. Every connected browser — on any
// framework page, in any tab — subscribes to it and updates the instant the
// server publishes, with no polling.
export const COUNTER_TOPIC = "counter";

const hub = createReactiveHub();

// In a real app this lives in your database; here a single in-memory number is
// enough to show the reactive-push pattern.
const state = { count: 0 };

const broadcast = () => hub.publish(COUNTER_TOPIC, { count: state.count });

// Mounts the SSE endpoint at GET /sync (the client subscribes with
// `?topics=counter`) plus the tiny read + mutation routes the pages call.
export const syncPlugin = new Elysia()
  .use(sync({ hub, path: "/sync" }))
  .get("/api/state", () => ({ count: state.count }))
  .post("/api/bump", () => {
    state.count += 1;
    broadcast();

    return { count: state.count };
  })
  .post("/api/reset", () => {
    state.count = 0;
    broadcast();

    return { count: state.count };
  });
