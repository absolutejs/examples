<script setup lang="ts">
import { ref } from "vue";
import Nav from "../components/Nav.vue";
import RegistrationCard from "../components/RegistrationCard.vue";
import CacheCard from "../components/CacheCard.vue";
import PingCard from "../components/PingCard.vue";
import FetchCard from "../components/FetchCard.vue";
import LifecycleCard from "../components/LifecycleCard.vue";
import OfflineCard from "../components/OfflineCard.vue";

const swReady = ref(false);

function onRegistered(reg: ServiceWorkerRegistration | null) {
  swReady.value = reg !== null;
}
</script>

<template>
  <Nav />

  <main>
    <div class="page-title">
      <img src="/assets/svg/vue-logo.svg" height="32" alt="Vue" />
      <h1>Vue</h1>
    </div>

    <div class="sw-cards">
      <RegistrationCard @registered="onRegistered" />
      <CacheCard :swReady="swReady" />
      <PingCard :swReady="swReady" />
      <FetchCard :swReady="swReady" />
      <LifecycleCard :swReady="swReady" />
      <OfflineCard :swReady="swReady" />
    </div>

    <p class="footer">
      <img src="/assets/png/absolutejs-temp.png" alt="" />
      Powered by
      <a href="https://absolutejs.com" target="_blank" rel="noopener noreferrer"
        >AbsoluteJS</a
      >
    </p>
  </main>
</template>
