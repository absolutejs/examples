<script lang="ts">
  type NavProps = {
    active?: string;
    cssPath?: string;
  };

  let { active, cssPath }: NavProps = $props();
</script>

<svelte:head>
  <meta charset="utf-8" />
  <title>AbsoluteJS SPA — Svelte</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="/assets/ico/favicon.ico" />
  {#if cssPath}
    <link rel="stylesheet" href={cssPath} type="text/css" />
  {/if}
</svelte:head>

<header>
  <a class="logo" href="/">
    <img alt="AbsoluteJS" height="24" src="/assets/png/absolutejs-temp.png" />
    AbsoluteJS
  </a>
  <nav>
    <a class={active === "react" ? "active" : ""} href="/react">React</a>
    <a class={active === "svelte" ? "active" : ""} href="/svelte">Svelte</a>
    <a class={active === "vue" ? "active" : ""} href="/vue">Vue</a>
    <a class={active === "angular" ? "active" : ""} href="/angular">Angular</a>
  </nav>
</header>
