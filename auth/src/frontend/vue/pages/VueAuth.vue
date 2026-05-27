<script lang="ts">
import { defineRoutes } from "@absolutejs/absolute/vue";
import AuditShowcase from "../components/AuditShowcase.vue";
import Connectors from "../components/Connectors.vue";
import CredentialsShowcase from "../components/CredentialsShowcase.vue";
import Home from "../components/Home.vue";
import IdpShowcase from "../components/IdpShowcase.vue";
import MfaShowcase from "../components/MfaShowcase.vue";
import PasskeysShowcase from "../components/PasskeysShowcase.vue";
import PasswordlessShowcase from "../components/PasswordlessShowcase.vue";
import Protected from "../components/Protected.vue";
import SessionsShowcase from "../components/SessionsShowcase.vue";
import Settings from "../components/Settings.vue";

export const routes = defineRoutes([
  { component: Home, path: "/vue" },
  { component: Protected, path: "/vue/protected" },
  { component: Settings, path: "/vue/settings" },
  { component: Connectors, path: "/vue/connectors" },
  { component: CredentialsShowcase, path: "/vue/credentials" },
  { component: PasskeysShowcase, path: "/vue/passkeys" },
  { component: MfaShowcase, path: "/vue/mfa" },
  { component: PasswordlessShowcase, path: "/vue/passwordless" },
  { component: SessionsShowcase, path: "/vue/sessions" },
  { component: AuditShowcase, path: "/vue/audit" },
  { component: IdpShowcase, path: "/vue/idp" },
]);
</script>

<script setup lang="ts">
import { RouterView } from "vue-router";
import Navbar from "../components/Navbar.vue";
import { useToast } from "../composables/useToast";

defineProps<{ cssPath?: string }>();

const { removeToast, toasts } = useToast();
</script>

<template>
  <div class="auth-shell">
    <Navbar />
    <main class="auth-main">
      <RouterView />
    </main>
    <div class="toast-stack">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="toast.tone === 'info' ? 'toast' : `toast toast--${toast.tone}`"
      >
        <span>{{ toast.message }}</span>
        <button
          class="toast__close"
          type="button"
          aria-label="Dismiss notification"
          @click="removeToast(toast.id)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>
