<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import Nav from "../components/Nav.vue";

type Job = {
  attempts: number;
  createdAt: number;
  id: string;
  label: string;
  status: string;
};

type JobsResponse = {
  counts: Record<string, number>;
  jobs: Job[];
};

const STATUS_LABEL: Record<string, string> = {
  canceled: "Canceled",
  claimed: "Running",
  dead: "Failed",
  done: "Done",
  pending: "Queued",
};

const STAT_ORDER: Array<{ label: string; status: string }> = [
  { label: "Queued", status: "pending" },
  { label: "Running", status: "claimed" },
  { label: "Done", status: "done" },
  { label: "Failed", status: "dead" },
];

const jobs = ref<Job[]>([]);
const counts = ref<Record<string, number>>({});
let intervalId: ReturnType<typeof setInterval> | null = null;

const refresh = () =>
  fetch("/api/jobs")
    .then((response) => response.json())
    .then((data: JobsResponse) => {
      jobs.value = data.jobs;
      counts.value = data.counts;
    });

onMounted(() => {
  void refresh();
  intervalId = setInterval(refresh, 1000);
});

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
});

const enqueue = () => {
  void fetch("/api/enqueue", { method: "POST" });
};
</script>

<template>
  <div class="queue-shell">
    <Nav />
    <main>
      <div class="page-title">
        <img alt="Vue" src="/assets/svg/vue-logo.svg" />
        <h1>Vue</h1>
        <span class="badge">@absolutejs/queue</span>
      </div>

      <p class="section-desc">
        Enqueue a job and watch the in-process worker pick it up. The handler
        simulates work and occasionally fails the first attempt, so the queue's
        automatic retry (and eventual <code>done</code>) is visible.
      </p>

      <div class="queue-actions">
        <button class="primary" type="button" @click="enqueue">
          Enqueue job
        </button>
      </div>

      <div class="queue-stats">
        <span class="stat" v-for="stat in STAT_ORDER" :key="stat.status">
          <strong>{{ counts[stat.status] ?? 0 }}</strong>
          {{ stat.label }}
        </span>
      </div>

      <div class="job-list">
        <p v-if="jobs.length === 0" class="job-empty">
          No jobs yet — enqueue one above.
        </p>
        <div class="job" v-for="job in jobs" :key="job.id">
          <span class="job-label">{{ job.label }}</span>
          <span class="job-meta">
            <span v-if="job.attempts > 1" class="job-attempts"
              >attempt {{ job.attempts }}</span
            >
            <span :class="`job-status job-status-${job.status}`">
              {{ STATUS_LABEL[job.status] ?? job.status }}
            </span>
          </span>
        </div>
      </div>

      <p class="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
          >AbsoluteJS</a
        >
      </p>
    </main>
  </div>
</template>
