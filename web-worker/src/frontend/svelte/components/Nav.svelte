<script lang="ts">
  type NavProps = {
    cssPath?: string;
  };

  let { cssPath }: NavProps = $props();
</script>

<svelte:head>
  <meta charset="utf-8" />
  <title>AbsoluteJS Workers - Svelte</title>
  <meta
    name="description"
    content="Web workers with Svelte, powered by AbsoluteJS."
  />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="/assets/ico/favicon.ico" />
  {#if cssPath}
    <link rel="stylesheet" href={cssPath} type="text/css" />
  {/if}
</svelte:head>

<header>
  <a href="/svelte" class="logo">
    <img src="/assets/png/absolutejs-temp.png" height="24" alt="AbsoluteJS" />
    AbsoluteJS
  </a>
  <nav>
    <a href="/">React</a>
    <a href="/svelte" class="active">Svelte</a>
    <a href="/vue">Vue</a>
    <a href="/angular">Angular</a>
    <a href="/html">HTML</a>
  </nav>
</header>
