<script setup lang="ts">
import Nav from "../components/Nav.vue";
import HashCard from "../components/HashCard.vue";
import PrimeCard from "../components/PrimeCard.vue";
import SortCard from "../components/SortCard.vue";
import ThreadRaceCard from "../components/ThreadRaceCard.vue";
import ImageCard from "../components/ImageCard.vue";
import ParallelCard from "../components/ParallelCard.vue";
</script>

<template>
  <Nav />

  <main>
    <div class="page-title">
      <img src="/assets/svg/vue-logo.svg" height="32" alt="Vue" />
      <h1>Vue</h1>
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
</template>
