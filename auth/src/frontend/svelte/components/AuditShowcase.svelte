<script lang="ts">
  // Tamper-evident audit log via the showcase admin endpoint /api/audit/events.
  // The backend wraps the Neon audit sink in createTamperEvidentSink: every event is
  // hash-chained, and verifyAuditChain returns a per-writer integrity report.
  import { onMount } from "svelte";

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

  let data = $state<AuditPayload | null>(null);
  let error = $state<string | null>(null);
  let pending = $state(false);

  const fetchEvents = async () => {
    pending = true;
    error = null;
    try {
      const response = await fetch("/api/audit/events");
      if (!response.ok) {
        const text = (await response.text()).replace(/^"|"$/g, "");
        throw new Error(text || response.statusText);
      }
      data = (await response.json()) as AuditPayload;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Failed to load";
    } finally {
      pending = false;
    }
  };

  onMount(() => {
    void fetchEvents();
  });
</script>

<section class="auth-section stack">
  <div>
    <h1 class="page-heading">Audit log integrity</h1>
    <p class="muted">
      Every event emitted by <code>@absolutejs/auth</code> is captured by the
      tamper-evident sink (<code>createTamperEvidentSink</code> wraps the Neon
      sink) and hash-chained per writer. <code>verifyAuditChain</code> reports
      any break.
    </p>
  </div>

  <div class="stack">
    <button
      class="button"
      disabled={pending}
      type="button"
      onclick={fetchEvents}
    >
      {pending ? "Loading…" : "Refresh"}
    </button>

    {#if error !== null}
      <p class="auth-error" role="alert">{error}</p>
    {/if}

    {#if data !== null}
      <h2>Integrity</h2>
      <ul class="showcase-monospace">
        {#each data.verification as check (check.writerId ?? "default")}
          <li class={check.ok ? "muted" : "auth-error"}>
            writer={check.writerId ?? "—"} ok={String(check.ok)}
            {#if check.brokenAt !== undefined}
              brokenAt={new Date(check.brokenAt).toISOString()}
            {/if}
          </li>
        {/each}
      </ul>

      <h2>Recent events ({data.events.length})</h2>
      <ul class="stack">
        {#each data.events as event (`${event.at}-${event.type}-${event.userId ?? "anon"}`)}
          <li class="showcase-card">
            <div>
              <strong>{event.type}</strong>
              <span class="muted">{new Date(event.at).toISOString()}</span>
            </div>
            {#if event.userId !== undefined}
              <div class="muted">user: {event.userId}</div>
            {/if}
            {#if event.ip !== undefined}
              <div class="muted">ip: {event.ip}</div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
