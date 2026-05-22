<script lang="ts">
  import {
    VOICE_DEMO_GUIDE_STEPS,
    VOICE_DEMO_GUIDE_TITLE,
  } from "../../../shared/demo";
</script>

<article class="voice-card voice-card-side">
  <h2>{VOICE_DEMO_GUIDE_TITLE}</h2>
  <ol class="voice-guide-list">
    {#each VOICE_DEMO_GUIDE_STEPS as step}
      <li>{step}</li>
    {/each}
  </ol>
</article>
