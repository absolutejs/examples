<script lang="ts">
  import { onDestroy, onMount } from "svelte";
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

  let form: LeadFormPayload = emptyLead();
  let submitting = false;
  let status: { kind: "success" | "error"; message: string } | null = null;
  let contacts: SavedContact[] = [];
  let interval: ReturnType<typeof setInterval> | null = null;

  const refresh = async () => {
    contacts = await fetchRecentContacts();
  };

  onMount(() => {
    void refresh();
    interval = setInterval(refresh, 5_000);
  });

  onDestroy(() => {
    if (interval !== null) clearInterval(interval);
  });

  const handleSubmit = async () => {
    submitting = true;
    status = null;
    const result = await submitLead(form);
    submitting = false;
    if (!result.ok) {
      status = {
        kind: "error",
        message: result.error ?? "Submission failed",
      };
      return;
    }
    status = {
      kind: "success",
      message: `Lead captured (${result.contact?.id ?? "unknown"})`,
    };
    form = emptyLead();
    await refresh();
  };
</script>

<div class="crm-page">
  <div class="crm-shell">
    <header class="crm-header">
      <div class="crm-header__brand">
        <strong>@absolutejs/crm</strong>
        <span>{PAGE_TAGLINE}</span>
      </div>
      <nav class="crm-nav" aria-label="Frameworks">
        {#each FRAMEWORKS as framework (framework.id)}
          <a
            href={framework.href}
            class={framework.id === "svelte" ? "is-active" : ""}
          >
            {framework.label}
          </a>
        {/each}
      </nav>
    </header>
    <section class="crm-hero">
      <h1>{PAGE_HEADLINE}</h1>
      <p>{PAGE_SUBHEADLINE}</p>
      <p style="margin-top: 0.75rem">
        <strong>Svelte: </strong>{FRAMEWORK_DESCRIPTIONS.svelte}
      </p>
    </section>
    <div class="crm-grid">
      <div class="crm-card">
        <h2>Lead capture form</h2>
        <form class="crm-form" on:submit|preventDefault={handleSubmit}>
          <div class="crm-form__row">
            <label>
              First name
              <input bind:value={form.firstName} required />
            </label>
            <label>
              Last name
              <input bind:value={form.lastName} required />
            </label>
          </div>
          <label>
            Email
            <input bind:value={form.email} type="email" required />
          </label>
          <div class="crm-form__row">
            <label>
              Phone
              <input bind:value={form.phone} />
            </label>
            <label>
              Company
              <input bind:value={form.company} />
            </label>
          </div>
          <label>
            Notes
            <textarea bind:value={form.notes} rows="3" />
          </label>
          <button class="crm-form__submit" type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Capture lead"}
          </button>
          {#if status}
            <div class="crm-status is-{status.kind}" role="status">
              {status.message}
            </div>
          {/if}
        </form>
        <pre class="crm-snippet">{FRAMEWORK_SNIPPETS.svelte}</pre>
      </div>
      <div class="crm-card">
        <h2>Recent contacts</h2>
        <div class="crm-contacts">
          {#if contacts.length === 0}
            <p style="color: var(--muted)">
              No leads yet — submit the form to see one land here.
            </p>
          {:else}
            {#each contacts as contact (contact.id)}
              <article class="crm-contact">
                <span class="crm-contact__time">
                  {formatRelativeTime(contact.createdAt)}
                </span>
                <div class="crm-contact__name">
                  {(contact.firstName ?? "") +
                    (contact.lastName ? " " + contact.lastName : "")}
                  {#if !contact.firstName && !contact.lastName}(unnamed){/if}
                </div>
                <div class="crm-contact__meta">
                  {contact.email ?? "—"}
                  {#if contact.phone} · {contact.phone}{/if}
                  {#if contact.company} · {contact.company}{/if}
                </div>
              </article>
            {/each}
          {/if}
        </div>
      </div>
    </div>
    <footer class="crm-footer">
      Backed by @absolutejs/crm runtime — same backend for all 6 framework pages.
    </footer>
  </div>
</div>
