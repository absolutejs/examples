<script setup lang="ts">
import { isValidProviderOption } from "citra";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
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
import { useAuth } from "../composables/useAuth";
import { useToast } from "../composables/useToast";
import NotAuthorized from "./NotAuthorized.vue";
import ProviderLogin from "./ProviderLogin.vue";

const { handleSignOut, loading, user } = useAuth();
const { addToast } = useToast();
const route = useRoute();
const router = useRouter();

const payload = ref<AuthIdentityPayload | null>(null);
const error = ref<string | null>(null);
const query = ref("");
const busyId = ref<string | null>(null);
const deleteOpen = ref(false);
const confirmText = ref("");
const dialogRef = ref<HTMLDialogElement | null>(null);

const providerLabel = (key: string) =>
  isValidProviderOption(key) ? providerData[key].name : key;
const providerLogo = (key: string) =>
  isValidProviderOption(key) ? providerData[key].logoUrl : "";

const refresh = async () => {
  error.value = null;
  try {
    payload.value = await fetchAuthIdentities();
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : "Failed to load identities";
  }
};

const runAction = async (
  id: string,
  action: () => Promise<AuthIdentityPayload>,
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

const pendingMerges = computed(
  () =>
    payload.value?.mergeRequests.filter((req) => req.status === "pending") ??
    [],
);

const groups = computed(() => {
  if (!payload.value) {
    return [];
  }
  const term = query.value.trim().toLowerCase();

  return Object.entries(payload.value.identities)
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

const fullName = computed(() =>
  [user.value?.first_name, user.value?.last_name]
    .filter((part) => typeof part === "string" && part.length > 0)
    .join(" "),
);

const closeDelete = () => {
  deleteOpen.value = false;
  confirmText.value = "";
};

const confirmDelete = async () => {
  try {
    await deleteAccount();
    addToast("Account deleted", "success");
    closeDelete();
    await handleSignOut();
    router.push("/vue");
  } catch (caught) {
    addToast(
      caught instanceof Error ? caught.message : "Delete failed",
      "error",
    );
  }
};

watch(deleteOpen, (open) => {
  const dialog = dialogRef.value;
  if (!dialog) {
    return;
  }
  if (open && !dialog.open) {
    dialog.showModal();
  }
  if (!open && dialog.open) {
    dialog.close();
  }
});

watch(
  user,
  (value) => {
    if (value && typeof window !== "undefined") {
      void refresh();
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (route.query.notice === "identity-already-linked") {
    addToast("That identity is already linked to your account.", "info");
    router.replace("/vue/settings");
  }
});
</script>

<template>
  <section v-if="loading" class="auth-content">
    <p class="muted">Checking your session…</p>
  </section>
  <NotAuthorized v-else-if="!user" />
  <section v-else class="auth-section stack">
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
          <span class="muted">Subject</span><span>{{ user.sub }}</span>
        </div>
        <div class="spread">
          <span class="muted">Name</span><span>{{ fullName || "—" }}</span>
        </div>
        <div class="spread">
          <span class="muted">Email</span><span>{{ user.email ?? "—" }}</span>
        </div>
        <div class="spread">
          <span class="muted">Primary identity</span>
          <span>{{ user.primary_auth_identity_id ?? "—" }}</span>
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
        <button class="btn btn--ghost btn--sm" type="button" @click="refresh">
          Refresh
        </button>
      </div>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <div v-if="pendingMerges.length > 0" class="stack">
        <h3 class="provider-heading">Merge requests</h3>
        <div class="entity-list">
          <div
            v-for="req in pendingMerges"
            :key="req.id"
            class="entity card--danger"
          >
            <div class="entity__meta">
              <span class="entity__title">
                {{ providerLabel(req.conflicting_auth_provider) }} conflict
              </span>
              <span class="entity__sub">
                Subject {{ req.conflicting_provider_subject }}
              </span>
            </div>
            <div class="entity__actions">
              <button
                class="btn btn--primary btn--sm"
                :disabled="busyId === req.id"
                type="button"
                @click="
                  runAction(
                    req.id,
                    () => mergeAccount(req.id),
                    'Accounts merged',
                  )
                "
              >
                Merge
              </button>
              <button
                class="btn btn--ghost btn--sm"
                :disabled="busyId === req.id"
                type="button"
                @click="
                  runAction(
                    req.id,
                    () => dismissMergeRequest(req.id),
                    'Merge request dismissed',
                  )
                "
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>

      <input
        class="search-input"
        placeholder="Search identities…"
        v-model="query"
      />

      <div v-if="payload && groups.length === 0" class="empty-state">
        No identities match your search.
      </div>

      <div v-for="group in groups" :key="group.provider" class="provider-group">
        <h3 class="provider-heading">
          <img
            v-if="providerLogo(group.provider)"
            class="entity__logo"
            alt=""
            :src="providerLogo(group.provider)"
          />
          {{ providerLabel(group.provider) }}
        </h3>
        <div class="entity-list">
          <div
            v-for="identity in group.identities"
            :key="identity.id"
            class="entity"
          >
            <div class="entity__main">
              <div class="entity__meta">
                <span class="entity__title">
                  {{ identity.provider_subject }}
                  <span v-if="identity.isPrimary" class="pill pill--primary">
                    Primary
                  </span>
                </span>
                <span class="entity__sub">{{ identity.id }}</span>
              </div>
            </div>
            <div class="entity__actions">
              <button
                v-if="!identity.isPrimary"
                class="btn btn--neutral btn--sm"
                :disabled="busyId === identity.id"
                type="button"
                @click="
                  runAction(
                    identity.id,
                    () => setPrimaryIdentity(identity.id),
                    'Primary identity updated',
                  )
                "
              >
                Set primary
              </button>
              <button
                class="btn btn--danger btn--sm"
                :disabled="busyId === identity.id"
                type="button"
                @click="
                  runAction(
                    identity.id,
                    () => removeIdentity(identity.id),
                    'Identity removed',
                  )
                "
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card card--danger text-left">
      <h2 class="card__title">Delete account</h2>
      <p class="muted">
        Permanently removes your user, all linked identities, and connector
        grants. This cannot be undone.
      </p>
      <button class="btn btn--danger" type="button" @click="deleteOpen = true">
        Delete account
      </button>
    </div>

    <dialog ref="dialogRef" class="auth-modal" @close="closeDelete">
      <h3 class="auth-modal__title">Delete your account?</h3>
      <p class="auth-modal__body">Type <strong>DELETE</strong> to confirm.</p>
      <input class="confirm-input" placeholder="DELETE" v-model="confirmText" />
      <div class="auth-modal__actions">
        <button class="btn btn--ghost" type="button" @click="closeDelete">
          Cancel
        </button>
        <button
          class="btn btn--danger"
          :disabled="confirmText !== 'DELETE'"
          type="button"
          @click="confirmDelete"
        >
          Delete account
        </button>
      </div>
    </dialog>
  </section>
</template>
