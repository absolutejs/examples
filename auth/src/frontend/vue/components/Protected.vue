<script setup lang="ts">
import { useAuth } from "../composables/useAuth";
import HighlightedJson from "./HighlightedJson.vue";
import NotAuthorized from "./NotAuthorized.vue";

const { loading, user } = useAuth();
</script>

<template>
  <section v-if="loading" class="auth-content">
    <p class="muted">Checking your session…</p>
  </section>
  <NotAuthorized v-else-if="!user" />
  <section v-else class="auth-section stack">
    <div>
      <h1 class="page-heading">Protected page</h1>
      <p class="muted">
        Your authenticated session resolves to this user record.
      </p>
    </div>
    <HighlightedJson :data="user" />
  </section>
</template>
