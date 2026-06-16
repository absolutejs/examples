/**
 * Single-package demo of @absolutejs/rate-limit. One global per-IP gate
 * (GCRA, the default algorithm) with per-route weighted cost: `/api/upload`
 * charges 5× what `/api/info` charges, the admin token skips the limit
 * entirely.
 *
 * Note for production multi-tier setups: scoping a separate limiter to a
 * subset of routes is done via Elysia's `.guard()` / `.macro()` — not by
 * `.use(limiter)` inside a `.group()` (which mounts the limiter's
 * `onRequest` globally). See the @absolutejs/rate-limit README for the
 * stacked-limiter pattern; this example keeps it to one limiter for
 * clarity.
 */

import { Elysia } from "elysia";
import { gcra, memoryStore, rateLimit } from "@absolutejs/rate-limit";

const store = memoryStore();

const ipLimiter = rateLimit({
  algorithm: gcra({ burst: 5, periodMs: 1000, requestsPerPeriod: 10 }),
  key: "ip",
  namespace: "demo:ip",
  store,
  trustedProxies: 1,
  // Heavy routes cost more.
  cost: (ctx) => (ctx.request.url.includes("/upload") ? 5 : 1),
  // Skip admin tokens.
  skip: (ctx) =>
    ctx.request.headers.get("authorization") === "Bearer demo-admin-token",
});

export const rateLimitPlugin = new Elysia({ name: "demo:rate-limit" })
  .use(ipLimiter)
  .get("/api/info", () => ({ result: "Cheap call (cost: 1)." }))
  .get("/api/upload", () => ({ result: "Expensive call (cost: 5)." }));
