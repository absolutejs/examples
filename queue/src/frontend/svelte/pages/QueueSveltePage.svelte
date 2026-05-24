<script lang="ts">
  import { onMount } from "svelte";
  import Nav from "../components/Nav.svelte";

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

  let { cssPath = undefined }: { cssPath?: string } = $props();

  let jobs = $state<Job[]>([]);
  let counts = $state<Record<string, number>>({});

  onMount(() => {
    const refresh = () =>
      fetch("/api/jobs")
        .then((response) => response.json())
        .then((data: JobsResponse) => {
          jobs = data.jobs;
          counts = data.counts;
        });

    void refresh();
    const intervalId = setInterval(refresh, 1000);

    return () => clearInterval(intervalId);
  });

  const enqueue = () => {
    void fetch("/api/enqueue", { method: "POST" });
  };
</script>

<div class="queue-shell">
  <Nav {cssPath} />

  <main>
    <div class="page-title">
      <img alt="Svelte" src="/assets/svg/svelte-logo.svg" />
      <h1>Svelte</h1>
      <span class="badge">@absolutejs/queue</span>
    </div>

    <p class="section-desc">
      Enqueue a job and watch the in-process worker pick it up. The handler
      simulates work and occasionally fails the first attempt, so the queue's
      automatic retry (and eventual <code>done</code>) is visible.
    </p>

    <div class="queue-actions">
      <button class="primary" type="button" onclick={enqueue}
        >Enqueue job</button
      >
    </div>

    <div class="queue-stats">
      {#each STAT_ORDER as stat (stat.status)}
        <span class="stat">
          <strong>{counts[stat.status] ?? 0}</strong>
          {stat.label}
        </span>
      {/each}
    </div>

    <div class="job-list">
      {#if jobs.length === 0}
        <p class="job-empty">No jobs yet — enqueue one above.</p>
      {:else}
        {#each jobs as job (job.id)}
          <div class="job">
            <span class="job-label">{job.label}</span>
            <span class="job-meta">
              {#if job.attempts > 1}
                <span class="job-attempts">attempt {job.attempts}</span>
              {/if}
              <span class="job-status job-status-{job.status}">
                {STATUS_LABEL[job.status] ?? job.status}
              </span>
            </span>
          </div>
        {/each}
      {/if}
    </div>

    <p class="footer">
      <img alt="" src="/assets/png/absolutejs-temp.png" />
      Powered by
      <a
        href="https://absolutejs.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        AbsoluteJS
      </a>
    </p>
  </main>
</div>
