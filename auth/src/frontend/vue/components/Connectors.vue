<script setup lang="ts">
import { ref, watch } from "vue";
import {
  fetchLinkedProviders,
  removeBinding,
  removeGrant,
} from "../../shared/authClient";
import { CONNECTOR_TARGETS } from "../../shared/navData";
import { authorizationHref } from "../../shared/oauth";
import { providerData } from "../../shared/providerData";
import type { LinkedProviderPayload } from "../../shared/types";
import { useAuth } from "../composables/useAuth";
import { useToast } from "../composables/useToast";
import NotAuthorized from "./NotAuthorized.vue";

const { loading, user } = useAuth();
const { addToast } = useToast();

const payload = ref<LinkedProviderPayload | null>(null);
const error = ref<string | null>(null);
const busyId = ref<string | null>(null);
const targets = CONNECTOR_TARGETS;

const refresh = async () => {
  error.value = null;
  try {
    payload.value = await fetchLinkedProviders();
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : "Failed to load connectors";
  }
};

const runAction = async (
  id: string,
  action: () => Promise<LinkedProviderPayload>,
  success: string,
) => {
  busyId.value = id;
  try {
    payload.value = await action();
    addToast(success, "success");
  } catch (caught) {
    addToast(
      caught instanceof Error ? caught.message : "Action failed",
      "error",
    );
  } finally {
    busyId.value = null;
  }
};

const formatTime = (value: number | undefined) =>
  value === undefined ? "—" : new Date(value).toLocaleString();

watch(
  user,
  (value) => {
    if (value && typeof window !== "undefined") {
      void refresh();
    }
  },
  { immediate: true },
);
</script>

<template>
  <section v-if="loading" class="auth-content">
    <p class="muted">Checking your session…</p>
  </section>
  <NotAuthorized v-else-if="!user" />
  <section v-else class="auth-section stack">
    <div>
      <h1 class="page-heading">Connectors</h1>
      <p class="muted">
        Link external accounts to grant the demo extra data scopes.
      </p>
    </div>

    <div class="grid-2">
      <div
        v-for="target in targets"
        :key="target.provider"
        class="card text-left"
      >
        <h2 class="card__title row">
          <img
            class="entity__logo"
            alt=""
            :src="providerData[target.provider].logoUrl"
          />
          {{ target.label }}
        </h2>
        <p class="muted">{{ target.description }}</p>
        <a
          class="btn btn--primary"
          :href="authorizationHref(target.provider, 'connector')"
        >
          Link {{ target.label }}
        </a>
      </div>
    </div>

    <div class="panel">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">Linked connectors</h2>
          <p class="muted">OAuth grants and discovered external accounts.</p>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" @click="refresh">
          Refresh
        </button>
      </div>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <h3 class="provider-heading">External accounts</h3>
      <div v-if="payload && payload.bindings.length === 0" class="empty-state">
        No external accounts linked.
      </div>
      <div class="entity-list">
        <div
          v-for="binding in payload?.bindings"
          :key="binding.id"
          class="entity"
        >
          <div class="entity__meta">
            <span class="entity__title">
              {{ binding.label ?? binding.externalAccountId }}
              <span class="pill">{{ binding.connectorProvider }}</span>
            </span>
            <span class="entity__sub">
              {{ binding.externalAccountType }} · {{ binding.status }}
            </span>
            <div class="scope-list">
              <span
                v-for="scope in binding.availableScopes"
                :key="scope"
                class="scope"
              >
                {{ scope }}
              </span>
            </div>
          </div>
          <div class="entity__actions">
            <button
              class="btn btn--danger btn--sm"
              :disabled="busyId === binding.id"
              type="button"
              @click="
                runAction(
                  binding.id,
                  () => removeBinding(binding.id),
                  'Binding removed',
                )
              "
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <h3 class="provider-heading">Grants</h3>
      <div v-if="payload && payload.grants.length === 0" class="empty-state">
        No connector grants yet.
      </div>
      <div class="entity-list">
        <div v-for="grant in payload?.grants" :key="grant.id" class="entity">
          <div class="entity__meta">
            <span class="entity__title">
              {{ grant.authProviderKey }}
              <span class="pill pill--indigo">{{ grant.status }}</span>
            </span>
            <span class="entity__sub">
              Subject {{ grant.providerSubject }} · updated
              {{ formatTime(grant.updatedAt) }}
            </span>
            <div class="scope-list">
              <span
                v-for="scope in grant.grantedScopes"
                :key="scope"
                class="scope"
              >
                {{ scope }}
              </span>
            </div>
          </div>
          <div class="entity__actions">
            <button
              class="btn btn--danger btn--sm"
              :disabled="busyId === grant.id"
              type="button"
              @click="
                runAction(
                  grant.id,
                  () => removeGrant(grant.id),
                  'Grant removed',
                )
              "
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
