<script setup lang="ts">
import {
  VOICE_DEMO_GUIDE_STEPS,
  VOICE_DEMO_GUIDE_TITLE,
} from "../../../constants/demoCopy";
</script>

<template>
  <article class="voice-card voice-card-side">
    <h2>{{ VOICE_DEMO_GUIDE_TITLE }}</h2>
    <ol class="voice-guide-list">
      <li v-for="step in VOICE_DEMO_GUIDE_STEPS" :key="step">
        {{ step }}
      </li>
    </ol>
  </article>
</template>
