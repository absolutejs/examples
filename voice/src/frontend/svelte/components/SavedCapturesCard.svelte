<script lang="ts">
  import { formatDateTime } from "../../../shared/browser";
  import { getVoiceModeLabel } from "../../../shared/demo";
  import type { SavedIntake } from "../../../types/domain";

  type SavedCapturesCardProps = {
    savedIntakes: SavedIntake[];
  };

  let { savedIntakes }: SavedCapturesCardProps = $props();
</script>

<article class="voice-card voice-hero">
  <h2>Saved captures</h2>
  <p class="voice-footnote">
    Open <a href="/reviews/latest">the latest review</a> or
    <a href="/reviews">browse all reviews</a> after a completed demo call.
  </p>
  <div class="voice-saved-list">
    {#if savedIntakes.length === 0}
      <p class="empty-copy">No saved captures yet.</p>
    {:else}
      {#each savedIntakes as intake}
        <article class="saved-item">
          <div class="saved-item-header">
            <strong>{intake.title}</strong>
            <span>{formatDateTime(intake.completedAt)}</span>
          </div>
          <div class="saved-item-meta">
            <span class="pill">{getVoiceModeLabel(intake.scenarioId)}</span>
            <span class="pill"
              >{intake.turnCount} turn{intake.turnCount === 1 ? "" : "s"}</span
            >
            {#if intake.detectedName}
              <span class="pill">{intake.detectedName}</span>
            {/if}
          </div>
          <div class="saved-answer-list">
            {#each intake.promptAnswers as entry}
              <div class="saved-answer">
                <div class="saved-answer-label">{entry.prompt}</div>
                <p class="saved-answer-text">{entry.response}</p>
              </div>
            {/each}
          </div>
          <div class="voice-assistant-label">Full transcript</div>
          <p>{intake.transcript}</p>
          <p class="saved-summary">{intake.assistantSummary}</p>
        </article>
      {/each}
    {/if}
  </div>
</article>
