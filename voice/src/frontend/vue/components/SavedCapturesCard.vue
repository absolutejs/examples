<script setup lang="ts">
import { formatDateTime } from "../../../shared/browser";
import { getVoiceModeLabel } from "../../../shared/demo";
import type { SavedIntake } from "../../../types/domain";

type SavedCapturesCardProps = {
  savedIntakes: SavedIntake[];
};

defineProps<SavedCapturesCardProps>();
</script>

<template>
  <article class="voice-card voice-hero">
    <h2>Saved captures</h2>
    <p class="voice-footnote">
      Open <a href="/reviews/latest">the latest review</a> or
      <a href="/reviews">browse all reviews</a> after a completed demo call.
    </p>
    <div class="voice-saved-list">
      <p v-if="savedIntakes.length === 0" class="empty-copy">
        No saved captures yet.
      </p>
      <article
        v-for="intake in savedIntakes"
        :key="intake.id"
        class="saved-item"
      >
        <div class="saved-item-header">
          <strong>{{ intake.title }}</strong>
          <span>{{ formatDateTime(intake.completedAt) }}</span>
        </div>
        <div class="saved-item-meta">
          <span class="pill">{{ getVoiceModeLabel(intake.scenarioId) }}</span>
          <span class="pill"
            >{{ intake.turnCount }} turn{{
              intake.turnCount === 1 ? "" : "s"
            }}</span
          >
          <span v-if="intake.detectedName" class="pill">
            {{ intake.detectedName }}
          </span>
        </div>
        <div class="saved-answer-list">
          <div
            v-for="entry in intake.promptAnswers"
            :key="entry.prompt"
            class="saved-answer"
          >
            <div class="saved-answer-label">{{ entry.prompt }}</div>
            <p class="saved-answer-text">{{ entry.response }}</p>
          </div>
        </div>
        <div class="voice-assistant-label">Full transcript</div>
        <p>{{ intake.transcript }}</p>
        <p class="saved-summary">{{ intake.assistantSummary }}</p>
      </article>
    </div>
  </article>
</template>
