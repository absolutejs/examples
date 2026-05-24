<script lang="ts">
  import Nav from "../components/Nav.svelte";
  import RegistrationCard from "../components/RegistrationCard.svelte";
  import CacheCard from "../components/CacheCard.svelte";
  import PingCard from "../components/PingCard.svelte";
  import FetchCard from "../components/FetchCard.svelte";
  import LifecycleCard from "../components/LifecycleCard.svelte";
  import OfflineCard from "../components/OfflineCard.svelte";

  type SwDemoProps = {
    cssPath?: string;
  };

  let { cssPath }: SwDemoProps = $props();
  let swReady = $state(false);

  function onRegistered(reg: ServiceWorkerRegistration | null) {
    swReady = reg !== null;
  }
</script>

<div>
  <Nav {cssPath} />

  <main>
    <div class="page-title">
      <img src="/assets/svg/svelte-logo.svg" height="32" alt="Svelte" />
      <h1>Svelte</h1>
    </div>

    <div class="sw-cards">
      <RegistrationCard {onRegistered} />
      <CacheCard {swReady} />
      <PingCard {swReady} />
      <FetchCard {swReady} />
      <LifecycleCard {swReady} />
      <OfflineCard {swReady} />
    </div>

    <p class="footer">
      <img src="/assets/png/absolutejs-temp.png" alt="" />
      Powered by
      <a href="https://absolutejs.com" target="_blank" rel="noopener noreferrer"
        >AbsoluteJS</a
      >
    </p>
  </main>
</div>
