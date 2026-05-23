<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  emptyLead,
  fetchRecentContacts,
  submitLead,
} from "../../shared/browser";
import {
  FRAMEWORKS,
  FRAMEWORK_DESCRIPTIONS,
  FRAMEWORK_SNIPPETS,
  PAGE_HEADLINE,
  PAGE_SUBHEADLINE,
  PAGE_TAGLINE,
  formatRelativeTime,
  type LeadFormPayload,
  type SavedContact,
} from "../../../shared/demo";

const form = ref<LeadFormPayload>(emptyLead());
const submitting = ref(false);
const status = ref<{ kind: "success" | "error"; message: string } | null>(null);
const contacts = ref<SavedContact[]>([]);
let interval: ReturnType<typeof setInterval> | null = null;

const refresh = async () => {
  contacts.value = await fetchRecentContacts();
};

onMounted(() => {
  void refresh();
  interval = setInterval(refresh, 5_000);
});

onBeforeUnmount(() => {
  if (interval !== null) clearInterval(interval);
});

const handleSubmit = async () => {
  submitting.value = true;
  status.value = null;
  const result = await submitLead(form.value);
  submitting.value = false;
  if (!result.ok) {
    status.value = {
      kind: "error",
      message: result.error ?? "Submission failed",
    };
    return;
  }
  status.value = {
    kind: "success",
    message: `Lead captured (${result.contact?.id ?? "unknown"})`,
  };
  form.value = emptyLead();
  await refresh();
};
</script>

<template>
  <div class="crm-page">
    <div class="crm-shell">
      <header class="crm-header">
        <div class="crm-header__brand">
          <strong>@absolutejs/crm</strong>
          <span>{{ PAGE_TAGLINE }}</span>
        </div>
        <nav class="crm-nav" aria-label="Frameworks">
          <a
            v-for="framework in FRAMEWORKS"
            :key="framework.id"
            :href="framework.href"
            :class="framework.id === 'vue' ? 'is-active' : ''"
          >
            {{ framework.label }}
          </a>
        </nav>
      </header>
      <section class="crm-hero">
        <h1>{{ PAGE_HEADLINE }}</h1>
        <p>{{ PAGE_SUBHEADLINE }}</p>
        <p style="margin-top: 0.75rem">
          <strong>Vue: </strong>{{ FRAMEWORK_DESCRIPTIONS.vue }}
        </p>
      </section>
      <div class="crm-grid">
        <div class="crm-card">
          <h2>Lead capture form</h2>
          <form class="crm-form" @submit.prevent="handleSubmit">
            <div class="crm-form__row">
              <label>
                First name
                <input v-model="form.firstName" required />
              </label>
              <label>
                Last name
                <input v-model="form.lastName" required />
              </label>
            </div>
            <label>
              Email
              <input v-model="form.email" type="email" required />
            </label>
            <div class="crm-form__row">
              <label>
                Phone
                <input v-model="form.phone" />
              </label>
              <label>
                Company
                <input v-model="form.company" />
              </label>
            </div>
            <label>
              Notes
              <textarea v-model="form.notes" rows="3" />
            </label>
            <button
              class="crm-form__submit"
              type="submit"
              :disabled="submitting"
            >
              {{ submitting ? "Submitting…" : "Capture lead" }}
            </button>
            <div
              v-if="status"
              :class="`crm-status is-${status.kind}`"
              role="status"
            >
              {{ status.message }}
            </div>
          </form>
          <pre class="crm-snippet">{{ FRAMEWORK_SNIPPETS.vue }}</pre>
        </div>
        <div class="crm-card">
          <h2>Recent contacts</h2>
          <div class="crm-contacts">
            <p v-if="contacts.length === 0" style="color: var(--muted)">
              No leads yet — submit the form to see one land here.
            </p>
            <article
              v-for="contact in contacts"
              :key="contact.id"
              class="crm-contact"
            >
              <span class="crm-contact__time">
                {{ formatRelativeTime(contact.createdAt) }}
              </span>
              <div class="crm-contact__name">
                {{ contact.firstName || "" }}
                {{ contact.lastName ? " " + contact.lastName : "" }}
                <template v-if="!contact.firstName && !contact.lastName">
                  (unnamed)
                </template>
              </div>
              <div class="crm-contact__meta">
                {{ contact.email || "—" }}
                <template v-if="contact.phone"> · {{ contact.phone }}</template>
                <template v-if="contact.company">
                  · {{ contact.company }}</template
                >
              </div>
            </article>
          </div>
        </div>
      </div>
      <footer class="crm-footer">
        Backed by @absolutejs/crm runtime — same backend for all 6 framework
        pages.
      </footer>
    </div>
  </div>
</template>
