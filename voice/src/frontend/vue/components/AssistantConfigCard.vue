<script setup lang="ts">
import { VOICE_ASSISTANT_CONFIG } from "../../../constants/assistant";
</script>

<template>
  <article class="voice-card voice-assistant-config">
    <span class="voice-framework-pill">Assistant API</span>
    <h2>{{ VOICE_ASSISTANT_CONFIG.id }}</h2>
    <p class="voice-footnote">
      Powered by createVoiceAssistant with a
      {{ VOICE_ASSISTANT_CONFIG.recipe }} artifact plan.
    </p>
    <div class="voice-config-grid">
      <div>
        <div class="voice-assistant-label">Tools</div>
        <ul class="voice-compact-list">
          <li v-for="item in VOICE_ASSISTANT_CONFIG.tools" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>
      <div>
        <div class="voice-assistant-label">Guardrails</div>
        <ul class="voice-compact-list">
          <li v-for="item in VOICE_ASSISTANT_CONFIG.guardrails" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>
      <div>
        <div class="voice-assistant-label">Experiments</div>
        <ul class="voice-compact-list">
          <li v-for="item in VOICE_ASSISTANT_CONFIG.experiments" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>
      <div>
        <div class="voice-assistant-label">Artifacts</div>
        <ul class="voice-compact-list">
          <li v-for="item in VOICE_ASSISTANT_CONFIG.artifacts" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>
    </div>
    <p class="voice-footnote">
      <a href="/assistant">Open analytics</a> ·
      <a href="/tasks">Open tasks</a> ·
      <a href="/integrations">Open integration events</a> ·
      <a href="/barge-in">Open barge-in proof</a>
    </p>
  </article>
</template>
