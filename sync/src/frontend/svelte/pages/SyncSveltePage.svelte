<script lang="ts">
  import { onMount } from "svelte";
  import {
    createSyncSubscriber,
    type SyncSubscriber,
  } from "@absolutejs/sync/client";
  import Nav from "../components/Nav.svelte";

  let { cssPath = undefined }: { cssPath?: string } = $props();

  let count = $state(0);
  let connected = $state(false);

  onMount(() => {
    void fetch("/api/state")
      .then((response) => response.json())
      .then((data: { count: number }) => {
        count = data.count;
      });

    const subscriber: SyncSubscriber = createSyncSubscriber({
      onError: () => {
        connected = false;
      },
      onEvent: (event) => {
        const payload = event.payload as { count?: number } | undefined;
        if (payload?.count !== undefined) {
          count = payload.count;
        }
      },
      onOpen: () => {
        connected = true;
      },
      topics: ["counter"],
      url: "/sync",
    });

    return () => subscriber.close();
  });

  const bump = () => {
    void fetch("/api/bump", { method: "POST" });
  };
  const reset = () => {
    void fetch("/api/reset", { method: "POST" });
  };
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
      This counter lives on the server. Each page subscribes to the
      <code>counter</code> topic over a single Server-Sent Events stream and re-renders
      the moment the value changes — no polling, no refresh.
    </p>

    <section class="sync-card">
      <div class="sync-status">
        <span class={connected ? "dot dot-live" : "dot"}></span>
        {connected ? "Live — subscribed to /sync" : "Connecting…"}
      </div>
      <div class="sync-count">{count}</div>
      <div class="sync-actions">
        <button class="primary" type="button" onclick={bump}
          >Bump counter</button
        >
        <button type="button" onclick={reset}>Reset</button>
      </div>
    </section>

    <p class="section-desc">
      Open <code>/</code>, <code>/vue</code>, <code>/angular</code>,
      <code>/html</code>, or <code>/htmx</code> in another tab and bump from any of
      them — every open client updates at once.
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
