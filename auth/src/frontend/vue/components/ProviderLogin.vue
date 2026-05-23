<script setup lang="ts">
import { isValidProviderOption, providerOptions } from "citra";
import { computed, ref } from "vue";
import { FEATURED_LOGIN_PROVIDERS } from "../../shared/navData";
import { authorizationHref } from "../../shared/oauth";
import { providerData } from "../../shared/providerData";

const props = defineProps<{ action?: "login" | "link" }>();

const selected = ref("");
const verb = props.action === "link" ? "Link" : "Sign in with";
const featured = FEATURED_LOGIN_PROVIDERS;
const allProviders = providerOptions;

const selectedInfo = computed(() => {
  if (!isValidProviderOption(selected.value)) {
    return null;
  }
  const info = providerData[selected.value];

  return {
    href: authorizationHref(selected.value),
    logoUrl: info.logoUrl,
    name: info.name,
  };
});
</script>

<template>
  <div class="oauth-grid">
    <a
      v-for="provider in featured"
      :key="provider"
      class="oauth-button"
      :href="authorizationHref(provider)"
    >
      <img
        class="oauth-button__icon"
        alt=""
        :src="providerData[provider].logoUrl"
      />
      <span class="oauth-button__text">
        {{ verb }} {{ providerData[provider].name }}
      </span>
    </a>

    <div class="separator">
      <span class="separator__line" />
      <span class="separator__text">or any provider</span>
      <span class="separator__line" />
    </div>

    <select class="provider-select" v-model="selected">
      <option value="">Select a provider…</option>
      <option
        v-for="provider in allProviders"
        :key="provider"
        :value="provider"
      >
        {{ providerData[provider].name }}
      </option>
    </select>

    <a v-if="selectedInfo" class="oauth-button" :href="selectedInfo.href">
      <img class="oauth-button__icon" alt="" :src="selectedInfo.logoUrl" />
      <span class="oauth-button__text">{{ verb }} {{ selectedInfo.name }}</span>
    </a>
    <span v-else class="oauth-button oauth-button--disabled">
      <span class="oauth-button__text">Choose a provider above</span>
    </span>
  </div>
</template>
