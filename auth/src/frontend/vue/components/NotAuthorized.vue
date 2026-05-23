<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <section class="auth-content">
    <h1 class="page-heading">Not authorized</h1>
    <p class="muted">You need to sign in to view this page.</p>
    <RouterLink class="btn btn--primary" to="/vue">Go to sign in</RouterLink>
  </section>
</template>
