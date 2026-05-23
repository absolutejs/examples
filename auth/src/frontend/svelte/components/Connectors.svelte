<script lang="ts">
  import {
    fetchLinkedProviders,
    removeBinding,
    removeGrant,
  } from "../../shared/authClient";
  import { CONNECTOR_TARGETS } from "../../shared/navData";
  import { authorizationHref } from "../../shared/oauth";
  import { providerData } from "../../shared/providerData";
  import type { LinkedProviderPayload } from "../../shared/types";
  import { authState } from "../stores/auth.svelte";
  import { addToast } from "../stores/toast.svelte";
  import NotAuthorized from "./NotAuthorized.svelte";

  let payload = $state<LinkedProviderPayload | null>(null);
  let error = $state<string | null>(null);
  let busyId = $state<string | null>(null);
  let loaded = false;

  const refresh = async () => {
    error = null;
    try {
      payload = await fetchLinkedProviders();
    } catch (caught) {
      error =
        caught instanceof Error ? caught.message : "Failed to load connectors";
    }
  };

  const runAction = async (
    id: string,
    action: () => Promise<LinkedProviderPayload>,
    success: string,
  ) => {
    busyId = id;
    try {
      payload = await action();
      addToast(success, "success");
    } catch (caught) {
      addToast(
        caught instanceof Error ? caught.message : "Action failed",
        "error",
      );
    } finally {
      busyId = null;
    }
  };

  const formatTime = (value: number | undefined) =>
    value === undefined ? "—" : new Date(value).toLocaleString();

  $effect(() => {
    if (authState.user && !loaded) {
      loaded = true;
      void refresh();
    }
  });
</script>

{#if authState.loading}
  <section class="auth-content">
    <p class="muted">Checking your session…</p>
  </section>
{:else if !authState.user}
  <NotAuthorized />
{:else}
  <section class="auth-section stack">
    <div>
      <h1 class="page-heading">Connectors</h1>
      <p class="muted">
        Link external accounts to grant the demo extra data scopes.
      </p>
    </div>

    <div class="grid-2">
      {#each CONNECTOR_TARGETS as target (target.provider)}
        <div class="card text-left">
          <h2 class="card__title row">
            <img
              class="entity__logo"
              alt=""
              src={providerData[target.provider].logoUrl}
            />
            {target.label}
          </h2>
          <p class="muted">{target.description}</p>
          <a
            class="btn btn--primary"
            href={authorizationHref(target.provider, "connector")}
          >
            Link {target.label}
          </a>
        </div>
      {/each}
    </div>

    <div class="panel">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">Linked connectors</h2>
          <p class="muted">OAuth grants and discovered external accounts.</p>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" onclick={refresh}>
          Refresh
        </button>
      </div>

      {#if error}<div class="error-banner">{error}</div>{/if}

      <h3 class="provider-heading">External accounts</h3>
      {#if payload && payload.bindings.length === 0}
        <div class="empty-state">No external accounts linked.</div>
      {/if}
      <div class="entity-list">
        {#each payload?.bindings ?? [] as binding (binding.id)}
          <div class="entity">
            <div class="entity__meta">
              <span class="entity__title">
                {binding.label ?? binding.externalAccountId}
                <span class="pill">{binding.connectorProvider}</span>
              </span>
              <span class="entity__sub">
                {binding.externalAccountType} · {binding.status}
              </span>
              <div class="scope-list">
                {#each binding.availableScopes as scope (scope)}
                  <span class="scope">{scope}</span>
                {/each}
              </div>
            </div>
            <div class="entity__actions">
              <button
                class="btn btn--danger btn--sm"
                disabled={busyId === binding.id}
                type="button"
                onclick={() =>
                  runAction(
                    binding.id,
                    () => removeBinding(binding.id),
                    "Binding removed",
                  )}
              >
                Remove
              </button>
            </div>
          </div>
        {/each}
      </div>

      <h3 class="provider-heading">Grants</h3>
      {#if payload && payload.grants.length === 0}
        <div class="empty-state">No connector grants yet.</div>
      {/if}
      <div class="entity-list">
        {#each payload?.grants ?? [] as grant (grant.id)}
          <div class="entity">
            <div class="entity__meta">
              <span class="entity__title">
                {grant.authProviderKey}
                <span class="pill pill--indigo">{grant.status}</span>
              </span>
              <span class="entity__sub">
                Subject {grant.providerSubject} · updated {formatTime(
                  grant.updatedAt,
                )}
              </span>
              <div class="scope-list">
                {#each grant.grantedScopes as scope (scope)}
                  <span class="scope">{scope}</span>
                {/each}
              </div>
            </div>
            <div class="entity__actions">
              <button
                class="btn btn--danger btn--sm"
                disabled={busyId === grant.id}
                type="button"
                onclick={() =>
                  runAction(
                    grant.id,
                    () => removeGrant(grant.id),
                    "Grant removed",
                  )}
              >
                Remove
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>
{/if}
