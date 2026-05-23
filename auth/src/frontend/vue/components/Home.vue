<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useAuth } from "../composables/useAuth";
import ProviderLogin from "./ProviderLogin.vue";

const { user } = useAuth();
</script>

<template>
  <section class="auth-content">
    <h1 class="page-heading">Absolute Auth — Vue</h1>
    <template v-if="user">
      <p class="muted">You are signed in as {{ user.email ?? user.sub }}.</p>
      <RouterLink class="btn btn--primary" to="/vue/protected">
        View the protected page
      </RouterLink>
    </template>
    <template v-else>
      <p class="muted">
        Sign in or sign up with any OAuth2 provider to test the flow.
      </p>
      <div class="card login-card text-left">
        <ProviderLogin action="login" />
      </div>
    </template>
  </section>
</template>
