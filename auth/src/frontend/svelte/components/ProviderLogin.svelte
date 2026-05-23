<script lang="ts">
  import { isValidProviderOption, providerOptions } from "citra";
  import { FEATURED_LOGIN_PROVIDERS } from "../../shared/navData";
  import { authorizationHref } from "../../shared/oauth";
  import { providerData } from "../../shared/providerData";

  let { action = "login" }: { action?: "login" | "link" } = $props();

  let selected = $state("");
  const verb = action === "link" ? "Link" : "Sign in with";
  const selectedInfo = $derived(
    isValidProviderOption(selected)
      ? {
          href: authorizationHref(selected),
          logoUrl: providerData[selected].logoUrl,
          name: providerData[selected].name,
        }
      : null,
  );
</script>

<div class="oauth-grid">
  {#each FEATURED_LOGIN_PROVIDERS as provider (provider)}
    <a class="oauth-button" href={authorizationHref(provider)}>
      <img
        class="oauth-button__icon"
        alt=""
        src={providerData[provider].logoUrl}
      />
      <span class="oauth-button__text">
        {verb}
        {providerData[provider].name}
      </span>
    </a>
  {/each}

  <div class="separator">
    <span class="separator__line"></span>
    <span class="separator__text">or any provider</span>
    <span class="separator__line"></span>
  </div>

  <select class="provider-select" bind:value={selected}>
    <option value="">Select a provider…</option>
    {#each providerOptions as provider (provider)}
      <option value={provider}>{providerData[provider].name}</option>
    {/each}
  </select>

  {#if selectedInfo}
    <a class="oauth-button" href={selectedInfo.href}>
      <img class="oauth-button__icon" alt="" src={selectedInfo.logoUrl} />
      <span class="oauth-button__text">{verb} {selectedInfo.name}</span>
    </a>
  {:else}
    <span class="oauth-button oauth-button--disabled">
      <span class="oauth-button__text">Choose a provider above</span>
    </span>
  {/if}
</div>
