<script lang="ts">
  import Nav from "../components/Nav.svelte";
  import HashCard from "../components/HashCard.svelte";
  import PrimeCard from "../components/PrimeCard.svelte";
  import SortCard from "../components/SortCard.svelte";
  import ThreadRaceCard from "../components/ThreadRaceCard.svelte";
  import ImageCard from "../components/ImageCard.svelte";
  import ParallelCard from "../components/ParallelCard.svelte";

  type WorkerDemoProps = {
    cssPath?: string;
  };

  let { cssPath }: WorkerDemoProps = $props();
</script>

<Nav {cssPath} />

<main>
  <div class="page-title">
    <img src="/assets/svg/svelte-logo.svg" height="32" alt="Svelte" />
    <h1>Svelte</h1>
  </div>

  <div class="worker-cards">
    <HashCard />
    <PrimeCard />
    <SortCard />
    <ThreadRaceCard />
    <ImageCard />
    <ParallelCard />
  </div>

  <p class="footer">
    <img src="/assets/png/absolutejs-temp.png" alt="" />
    Powered by
    <a href="https://absolutejs.com" target="_blank" rel="noopener noreferrer"
      >AbsoluteJS</a
    >
  </p>
</main>
