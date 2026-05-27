<script lang="ts">
  // Self-service session management via the useSessions composable from
  // @absolutejs/auth/svelte. Lists the signed-in user's active sessions and revokes
  // any one of them remotely. The composable handles fetch + cache + refetch-on-revoke.
  import { useSessions } from "@absolutejs/auth/svelte";
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

  let sessions = $derived<SessionRow[]>(
    Array.isArray($data) ? $data.filter(isSessionRow) : [],
  );
</script>

<section class="auth-section stack">
  <div>
    <h1 class="page-heading">Sessions</h1>
    <p class="muted">
      Every active session for the signed-in user. Revoke any device remotely;
      the affected client&apos;s next request returns 401.
    </p>
  </div>

  <div class="stack">
    <button class="button" type="button" onclick={refetch}>Refresh</button>
    {#if $isPending}<p class="muted">Loading…</p>{/if}
    {#if $error !== null}
      <p class="auth-error" role="alert">{$error.message}</p>
    {/if}
    {#if !$isPending && sessions.length === 0}
      <p class="muted">
        No active sessions returned (you may not be signed in).
      </p>
    {/if}
    <ul class="stack">
      {#each sessions as session (session.id)}
        <li class="showcase-card--lg">
          <div class="showcase-monospace">{session.id}</div>
          {#if typeof session.userAgent === "string"}
            <div class="muted">{session.userAgent}</div>
          {/if}
          {#if typeof session.ip === "string"}
            <div class="muted">IP: {session.ip}</div>
          {/if}
          <button class="button" type="button" onclick={() => revoke(session.id)}>
            Revoke
          </button>
        </li>
      {/each}
    </ul>
  </div>
</section>
