<script lang="ts">
  import { isValidProviderOption } from "citra";
  import { onMount } from "svelte";
  import { goto, page } from "@absolutejs/absolute/svelte/router";
  import {
    deleteAccount,
    dismissMergeRequest,
    fetchAuthIdentities,
    mergeAccount,
    removeIdentity,
    setPrimaryIdentity,
  } from "../../shared/authClient";
  import { providerData } from "../../shared/providerData";
  import type { AuthIdentityPayload } from "../../shared/types";
  import { authState, signOutUser } from "../stores/auth.svelte";
  import { addToast } from "../stores/toast.svelte";
  import NotAuthorized from "./NotAuthorized.svelte";
  import ProviderLogin from "./ProviderLogin.svelte";

  let payload = $state<AuthIdentityPayload | null>(null);
  let error = $state<string | null>(null);
  let query = $state("");
  let busyId = $state<string | null>(null);
  let deleteOpen = $state(false);
  let confirmText = $state("");
  let loaded = false;
  let dialogRef = $state<HTMLDialogElement | null>(null);

  const providerLabel = (key: string) =>
    isValidProviderOption(key) ? providerData[key].name : key;
  const providerLogo = (key: string) =>
    isValidProviderOption(key) ? providerData[key].logoUrl : "";

  const refresh = async () => {
    error = null;
    try {
      payload = await fetchAuthIdentities();
    } catch (caught) {
      error =
        caught instanceof Error ? caught.message : "Failed to load identities";
    }
  };

  const runAction = async (
    id: string,
    action: () => Promise<AuthIdentityPayload>,
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

  const pendingMerges = $derived(
    payload?.mergeRequests.filter((req) => req.status === "pending") ?? [],
  );

  const groups = $derived.by(() => {
    if (!payload) {
      return [];
    }
    const term = query.trim().toLowerCase();

    return Object.entries(payload.identities)
      .map(([provider, identities]) => ({
        identities: identities.filter(
          (identity) =>
            term === "" ||
            providerLabel(provider).toLowerCase().includes(term) ||
            identity.id.toLowerCase().includes(term) ||
            identity.provider_subject.toLowerCase().includes(term),
        ),
        provider,
      }))
      .filter((group) => group.identities.length > 0);
  });

  const fullName = $derived(
    [authState.user?.first_name, authState.user?.last_name]
      .filter((part) => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const closeDelete = () => {
    deleteOpen = false;
    confirmText = "";
  };

  const confirmDelete = async () => {
    try {
      await deleteAccount();
      addToast("Account deleted", "success");
      closeDelete();
      await signOutUser();
      goto("/svelte");
    } catch (caught) {
      addToast(
        caught instanceof Error ? caught.message : "Delete failed",
        "error",
      );
    }
  };

  $effect(() => {
    if (authState.user && !loaded) {
      loaded = true;
      void refresh();
    }
  });

  $effect(() => {
    const dialog = dialogRef;
    if (!dialog) {
      return;
    }
    if (deleteOpen && !dialog.open) {
      dialog.showModal();
    }
    if (!deleteOpen && dialog.open) {
      dialog.close();
    }
  });

  onMount(() => {
    if (page.url.searchParams.get("notice") === "identity-already-linked") {
      addToast("That identity is already linked to your account.", "info");
      goto("/svelte/settings");
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
      <h1 class="page-heading">Account settings</h1>
      <p class="muted">Manage the login identities linked to your account.</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2 class="card__title">Canonical account</h2>
        <p class="muted">
          Absolute Auth keeps one canonical user and links every OAuth identity
          to it. Conflicting identities raise a merge request.
        </p>
      </div>
      <div class="card text-left">
        <h2 class="card__title">Profile fields</h2>
        <div class="spread">
          <span class="muted">Subject</span><span>{authState.user.sub}</span>
        </div>
        <div class="spread">
          <span class="muted">Name</span><span>{fullName || "—"}</span>
        </div>
        <div class="spread">
          <span class="muted">Email</span><span
            >{authState.user.email ?? "—"}</span
          >
        </div>
        <div class="spread">
          <span class="muted">Primary identity</span>
          <span>{authState.user.primary_auth_identity_id ?? "—"}</span>
        </div>
      </div>
    </div>

    <div class="card text-left">
      <h2 class="card__title">Link another login provider</h2>
      <p class="muted">Adds a new way to sign in to this same account.</p>
      <div class="login-card"><ProviderLogin action="link" /></div>
    </div>

    <div class="panel">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">Linked login identities</h2>
          <p class="muted">Search, set a primary, remove, or resolve merges.</p>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" onclick={refresh}>
          Refresh
        </button>
      </div>

      {#if error}<div class="error-banner">{error}</div>{/if}

      {#if pendingMerges.length > 0}
        <div class="stack">
          <h3 class="provider-heading">Merge requests</h3>
          <div class="entity-list">
            {#each pendingMerges as req (req.id)}
              <div class="entity card--danger">
                <div class="entity__meta">
                  <span class="entity__title">
                    {providerLabel(req.conflicting_auth_provider)} conflict
                  </span>
                  <span class="entity__sub">
                    Subject {req.conflicting_provider_subject}
                  </span>
                </div>
                <div class="entity__actions">
                  <button
                    class="btn btn--primary btn--sm"
                    disabled={busyId === req.id}
                    type="button"
                    onclick={() =>
                      runAction(
                        req.id,
                        () => mergeAccount(req.id),
                        "Accounts merged",
                      )}
                  >
                    Merge
                  </button>
                  <button
                    class="btn btn--ghost btn--sm"
                    disabled={busyId === req.id}
                    type="button"
                    onclick={() =>
                      runAction(
                        req.id,
                        () => dismissMergeRequest(req.id),
                        "Merge request dismissed",
                      )}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <input
        class="search-input"
        placeholder="Search identities…"
        bind:value={query}
      />

      {#if payload && groups.length === 0}
        <div class="empty-state">No identities match your search.</div>
      {/if}

      {#each groups as group (group.provider)}
        <div class="provider-group">
          <h3 class="provider-heading">
            {#if providerLogo(group.provider)}
              <img
                class="entity__logo"
                alt=""
                src={providerLogo(group.provider)}
              />
            {/if}
            {providerLabel(group.provider)}
          </h3>
          <div class="entity-list">
            {#each group.identities as identity (identity.id)}
              <div class="entity">
                <div class="entity__main">
                  <div class="entity__meta">
                    <span class="entity__title">
                      {identity.provider_subject}
                      {#if identity.isPrimary}
                        <span class="pill pill--primary">Primary</span>
                      {/if}
                    </span>
                    <span class="entity__sub">{identity.id}</span>
                  </div>
                </div>
                <div class="entity__actions">
                  {#if !identity.isPrimary}
                    <button
                      class="btn btn--neutral btn--sm"
                      disabled={busyId === identity.id}
                      type="button"
                      onclick={() =>
                        runAction(
                          identity.id,
                          () => setPrimaryIdentity(identity.id),
                          "Primary identity updated",
                        )}
                    >
                      Set primary
                    </button>
                  {/if}
                  <button
                    class="btn btn--danger btn--sm"
                    disabled={busyId === identity.id}
                    type="button"
                    onclick={() =>
                      runAction(
                        identity.id,
                        () => removeIdentity(identity.id),
                        "Identity removed",
                      )}
                  >
                    Remove
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="card card--danger text-left">
      <h2 class="card__title">Delete account</h2>
      <p class="muted">
        Permanently removes your user, all linked identities, and connector
        grants. This cannot be undone.
      </p>
      <button
        class="btn btn--danger"
        type="button"
        onclick={() => (deleteOpen = true)}
      >
        Delete account
      </button>
    </div>

    <dialog bind:this={dialogRef} class="auth-modal" onclose={closeDelete}>
      <h3 class="auth-modal__title">Delete your account?</h3>
      <p class="auth-modal__body">Type <strong>DELETE</strong> to confirm.</p>
      <input
        class="confirm-input"
        placeholder="DELETE"
        bind:value={confirmText}
      />
      <div class="auth-modal__actions">
        <button class="btn btn--ghost" type="button" onclick={closeDelete}>
          Cancel
        </button>
        <button
          class="btn btn--danger"
          disabled={confirmText !== "DELETE"}
          type="button"
          onclick={confirmDelete}
        >
          Delete account
        </button>
      </div>
    </dialog>
  </section>
{/if}
