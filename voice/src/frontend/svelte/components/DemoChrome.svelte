<script lang="ts">
  import Head from "@absolutejs/absolute/svelte/components/Head.js";
  import { FRAMEWORKS } from "../../../constants/navigation";

  type DemoChromeProps = {
    children: import("svelte").Snippet;
    cssPath?: string;
  };

  let { children, cssPath }: DemoChromeProps = $props();
</script>

<Head
  title="AbsoluteJS Voice Test - Svelte"
  description="AbsoluteJS chat-style voice demo with guided and general modes in Svelte."
  {cssPath}
/>

<div class="voice-demo-page">
  <header>
    <a class="logo" href="/">
      <img src="/assets/png/absolutejs-temp.png" height="24" alt="AbsoluteJS" />
      AbsoluteJS
    </a>
    <nav>
      {#each FRAMEWORKS as framework}
        <a class:active={framework.id === "svelte"} href={framework.href}>
          {framework.label}
        </a>
      {/each}
      <a href="/reviews">Reviews</a>
      <a href="/traces">Traces</a>
      <a href="/carriers">Carriers</a>
      <a href="/phone-agent">Phone Agent</a>
    </nav>
  </header>
  <main class="voice-shell">
    <section class="voice-grid">
      {@render children()}
    </section>
    <p class="footer">
      <img src="/assets/png/absolutejs-temp.png" alt="" />
      Powered by
      <a href="https://absolutejs.com" target="_blank" rel="noopener noreferrer"
        >AbsoluteJS</a
      >
    </p>
  </main>
</div>
