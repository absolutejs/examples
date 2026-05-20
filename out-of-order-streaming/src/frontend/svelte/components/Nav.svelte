<script lang="ts">
  type Framework = "react" | "svelte" | "vue" | "angular" | "html" | "htmx";
  type Mode = "raw" | "framework";

  let {
    activeFramework,
    activeMode = "raw",
    cssPath,
  }: {
    activeFramework: Framework;
    activeMode?: Mode;
    cssPath?: string;
  } = $props();

  const rawFrameworkLinks = {
    react: "/",
    svelte: "/svelte",
    vue: "/vue",
    angular: "/angular",
    html: "/html",
    htmx: "/htmx",
  };

  const nativeFrameworkLinks = {
    react: "/react-framework",
    svelte: "/svelte-framework",
    vue: "/vue-framework",
    angular: "/angular-framework",
    html: "/html",
    htmx: "/htmx",
  };

  const isRawActive = (framework: Framework) =>
    activeMode === "raw" && activeFramework === framework;
  const isFrameworkActive = (framework: Framework) =>
    activeMode === "framework" && activeFramework === framework;
</script>

<svelte:head>
  <meta charset="utf-8" />
  <title>AbsoluteJS Streaming - Svelte</title>
  <meta
    name="description"
    content="Out-of-order streaming with Svelte, powered by AbsoluteJS."
  />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="/assets/ico/favicon.ico" />
  {#if cssPath}
    <link rel="stylesheet" href={cssPath} type="text/css" />
  {/if}
</svelte:head>

<header>
  <a href="/" class="logo">
    <img src="/assets/png/absolutejs-temp.png" height="24" alt="AbsoluteJS" />
    AbsoluteJS
  </a>
  <div class="nav-stack">
    <nav class="nav-row">
      <span class="nav-label">Raw Slots</span>
      <a href={rawFrameworkLinks.react} class:active={isRawActive("react")}
        >React</a
      >
      <a href={rawFrameworkLinks.svelte} class:active={isRawActive("svelte")}
        >Svelte</a
      >
      <a href={rawFrameworkLinks.vue} class:active={isRawActive("vue")}>Vue</a>
      <a href={rawFrameworkLinks.angular} class:active={isRawActive("angular")}
        >Angular</a
      >
      <a href={rawFrameworkLinks.html} class:active={isRawActive("html")}
        >HTML</a
      >
      <a href={rawFrameworkLinks.htmx} class:active={isRawActive("htmx")}
        >HTMX</a
      >
    </nav>
    <nav class="nav-row nav-row-secondary">
      <span class="nav-label">Framework Primitives</span>
      <a
        href={nativeFrameworkLinks.react}
        class:active={isFrameworkActive("react")}>React</a
      >
      <a
        href={nativeFrameworkLinks.svelte}
        class:active={isFrameworkActive("svelte")}>Svelte</a
      >
      <a href={nativeFrameworkLinks.vue} class:active={isFrameworkActive("vue")}
        >Vue</a
      >
      <a
        href={nativeFrameworkLinks.angular}
        class:active={isFrameworkActive("angular")}>Angular</a
      >
    </nav>
  </div>
</header>
