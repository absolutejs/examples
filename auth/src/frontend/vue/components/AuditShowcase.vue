<script setup lang="ts">
// Tamper-evident audit log via the showcase admin endpoint /api/audit/events.
// The backend wraps the Neon audit sink in createTamperEvidentSink: every event is
// hash-chained, and verifyAuditChain returns a per-writer integrity report.
import { onMounted, ref } from "vue";

type AuditEvent = {
  at: number;
  ip?: string;
  metadata?: Record<string, unknown>;
  type: string;
  userId?: string;
};

type ChainVerification = {
  brokenAt?: number;
  ok: boolean;
  writerId?: string;
}[];

type AuditPayload = {
  events: AuditEvent[];
  verification: ChainVerification;
};

const data = ref<AuditPayload | null>(null);
const error = ref<string | null>(null);
const pending = ref(false);

const fetchEvents = async () => {
  pending.value = true;
  error.value = null;
  try {
    const response = await fetch("/api/audit/events");
    if (!response.ok) {
      const text = (await response.text()).replace(/^"|"$/g, "");
      throw new Error(text || response.statusText);
    }
    data.value = (await response.json()) as AuditPayload;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Failed to load";
  } finally {
    pending.value = false;
  }
};

onMounted(() => {
  void fetchEvents();
});
</script>

<template>
  <section class="auth-section stack">
    <div>
      <h1 class="page-heading">Audit log integrity</h1>
      <p class="muted">
        Every event emitted by <code>@absolutejs/auth</code> is captured by the
        tamper-evident sink (<code>createTamperEvidentSink</code> wraps the Neon
        sink) and hash-chained per writer. <code>verifyAuditChain</code>
        reports any break.
      </p>
    </div>

    <div class="stack">
      <button
        class="button"
        :disabled="pending"
        type="button"
        @click="fetchEvents"
      >
        {{ pending ? "Loading…" : "Refresh" }}
      </button>

      <p v-if="error !== null" class="auth-error" role="alert">{{ error }}</p>

      <template v-if="data !== null">
        <h2>Integrity</h2>
        <ul class="showcase-monospace">
          <li
            v-for="check in data.verification"
            :key="check.writerId ?? 'default'"
            :class="check.ok ? 'muted' : 'auth-error'"
          >
            writer={{ check.writerId ?? "—" }} ok={{ String(check.ok) }}
            <template v-if="check.brokenAt !== undefined">
              brokenAt={{ new Date(check.brokenAt).toISOString() }}
            </template>
          </li>
        </ul>

        <h2>Recent events ({{ data.events.length }})</h2>
        <ul class="stack">
          <li
            v-for="event in data.events"
            :key="`${event.at}-${event.type}-${event.userId ?? 'anon'}`"
            class="showcase-card"
          >
            <div>
              <strong>{{ event.type }}</strong>
              <span class="muted">
                {{ new Date(event.at).toISOString() }}
              </span>
            </div>
            <div v-if="event.userId !== undefined" class="muted">
              user: {{ event.userId }}
            </div>
            <div v-if="event.ip !== undefined" class="muted">
              ip: {{ event.ip }}
            </div>
          </li>
        </ul>
      </template>
    </div>
  </section>
</template>
