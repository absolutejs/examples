<script lang="ts">
  import { VOICE_ASSISTANT_CONFIG } from "../../../shared/demo";
</script>

<article class="voice-card voice-assistant-config">
  <span class="voice-framework-pill">Assistant API</span>
  <h2>{VOICE_ASSISTANT_CONFIG.id}</h2>
  <p class="voice-footnote">
    Powered by createVoiceAssistant with a {VOICE_ASSISTANT_CONFIG.recipe} artifact
    plan.
  </p>
  <div class="voice-config-grid">
    <div>
      <div class="voice-assistant-label">Tools</div>
      <ul class="voice-compact-list">
        {#each VOICE_ASSISTANT_CONFIG.tools as item}
          <li>{item}</li>
        {/each}
      </ul>
    </div>
    <div>
      <div class="voice-assistant-label">Guardrails</div>
      <ul class="voice-compact-list">
        {#each VOICE_ASSISTANT_CONFIG.guardrails as item}
          <li>{item}</li>
        {/each}
      </ul>
    </div>
    <div>
      <div class="voice-assistant-label">Experiments</div>
      <ul class="voice-compact-list">
        {#each VOICE_ASSISTANT_CONFIG.experiments as item}
          <li>{item}</li>
        {/each}
      </ul>
    </div>
    <div>
      <div class="voice-assistant-label">Artifacts</div>
      <ul class="voice-compact-list">
        {#each VOICE_ASSISTANT_CONFIG.artifacts as item}
          <li>{item}</li>
        {/each}
      </ul>
    </div>
  </div>
  <p class="voice-footnote">
    <a href="/assistant">Open analytics</a> ·
    <a href="/tasks">Open tasks</a>
    · <a href="/integrations">Open integration events</a>
    · <a href="/barge-in">Open barge-in proof</a>
  </p>
</article>
