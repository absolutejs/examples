<script setup lang="ts">
// Self-service session management via the useSessions composable from
// @absolutejs/auth/vue. Lists the signed-in user's active sessions and revokes
// any one of them remotely. The composable handles fetch + cache + refetch-on-revoke.
import { useSessions } from "@absolutejs/auth/vue";
import { computed } from "vue";
import { authClient } from "../../shared/authClient";

type SessionRow = {
  createdAt?: number;
  current?: boolean;
  expiresAt?: number;
  id: string;
  ip?: string;
  userAgent?: string;
};

const isSessionRow = (value: unknown): value is SessionRow => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { id?: unknown };

  return typeof candidate.id === "string";
};

const { data, error, isPending, refetch, revoke } = useSessions(authClient);

const sessions = computed<SessionRow[]>(() =>
  Array.isArray(data.value) ? data.value.filter(isSessionRow) : [],
);
</script>

<template>
  <section class="auth-section stack">
    <div>
      <h1 class="page-heading">Sessions</h1>
      <p class="muted">
        Every active session for the signed-in user. Revoke any device
        remotely; the affected client&apos;s next request returns 401.
      </p>
    </div>

    <div class="stack">
      <button class="button" type="button" @click="refetch">Refresh</button>
      <p v-if="isPending" class="muted">Loading…</p>
      <p v-if="error !== null" class="auth-error" role="alert">
        {{ error.message }}
      </p>
      <p v-if="!isPending && sessions.length === 0" class="muted">
        No active sessions returned (you may not be signed in).
      </p>
      <ul class="stack">
        <li
          v-for="session in sessions"
          :key="session.id"
          class="showcase-card--lg"
        >
          <div class="showcase-monospace">{{ session.id }}</div>
          <div v-if="typeof session.userAgent === 'string'" class="muted">
            {{ session.userAgent }}
          </div>
          <div v-if="typeof session.ip === 'string'" class="muted">
            IP: {{ session.ip }}
          </div>
          <button class="button" type="button" @click="revoke(session.id)">
            Revoke
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
