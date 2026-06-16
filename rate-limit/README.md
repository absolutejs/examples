# absolutejs-rate-limit-example

Single-package example for [`@absolutejs/rate-limit`](https://github.com/absolutejs/rate-limit).
Boots an Elysia app with three rate-limiting setups:

1. **Global per-IP gate** — GCRA, 10 requests/second sustained with burst 5.
2. **Per-route cost** — `/api/upload` charges 5× what `/api/info` charges.
3. **Stacked per-user gate** — `combined` runs a per-user token bucket on
   top of a shared global one.

The React page surfaces the IETF `RateLimit-*` headers in a decision log so
you can watch the bucket drain and the breaker trip in real time.

## Run

```bash
bun install
bun run dev      # absolute dev — hot reload
# or
bun run start    # absolute start — production server
```

Then `http://localhost:3000/`.

## Test

```bash
PORT=3000 bun run test
```

Playwright drives the page through a burst that's guaranteed to throttle,
and confirms the IETF headers + Retry-After are emitted correctly.
