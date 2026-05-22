<script setup lang="ts">
import { VOICE_PROOF_DASHBOARDS } from "../../../shared/demo";
</script>

<template>
  <article class="voice-card voice-proof-dashboard-card">
    <span class="voice-framework-pill">Proof dashboards</span>
    <h2>Open the production evidence</h2>
    <p class="voice-footnote">
      The same trace-backed package routes work in every framework:
      interruption, live timing, turn waterfalls, readiness, and provider
      contracts.
    </p>
    <div class="voice-proof-links">
      <a
        v-for="dashboard in VOICE_PROOF_DASHBOARDS"
        :key="dashboard.href"
        :href="dashboard.href"
      >
        <strong>{{ dashboard.label }}</strong>
        <span>{{ dashboard.description }}</span>
      </a>
    </div>
  </article>
</template>
