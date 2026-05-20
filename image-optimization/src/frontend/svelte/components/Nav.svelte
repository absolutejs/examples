<script lang="ts">
  type NavProps = {
    cssPath?: string;
  };

  let { cssPath }: NavProps = $props();
</script>

<svelte:head>
  <meta charset="utf-8" />
  <title>AbsoluteJS Image Optimization - Svelte</title>
  <meta
    name="description"
    content="Image optimization with Svelte, powered by AbsoluteJS."
  />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="/assets/ico/favicon.ico" />
  {#if cssPath}
    <link rel="stylesheet" type="text/css" href={cssPath} />
  {/if}
</svelte:head>

<header>
  <a class="logo" href="/">
    <img alt="AbsoluteJS" height="24" src="/assets/png/absolutejs-temp.png" />
    AbsoluteJS
  </a>
  <nav>
    <a href="/">React</a>
    <a class="active" href="/svelte">Svelte</a>
    <a href="/vue">Vue</a>
    <a href="/angular">Angular</a>
    <a href="/html">HTML</a>
    <a href="/htmx">HTMX</a>
  </nav>
</header>
