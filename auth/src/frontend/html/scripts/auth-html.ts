import { isValidProviderOption, providerOptions } from "citra";
import { TOAST_DURATION } from "../../../constants";
import {
  deleteAccount,
  dismissMergeRequest,
  fetchAuthIdentities,
  fetchAuthStatus,
  fetchLinkedProviders,
  mergeAccount,
  removeBinding,
  removeGrant,
  removeIdentity,
  setPrimaryIdentity,
  signOut,
} from "../../shared/authClient";
import {
  CONNECTOR_TARGETS,
  FEATURED_LOGIN_PROVIDERS,
} from "../../shared/navData";
import { authorizationHref } from "../../shared/oauth";
import { providerData } from "../../shared/providerData";
import type {
  AuthIdentityPayload,
  AuthUser,
  LinkedProviderPayload,
} from "../../shared/types";

let currentUser: AuthUser | null = null;
let identityPayload: AuthIdentityPayload | null = null;
let linkedPayload: LinkedProviderPayload | null = null;
let identityQuery = "";

const must = (id: string) => {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing #${id}`);
  }

  return node;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const providerLabel = (key: string) =>
  isValidProviderOption(key) ? providerData[key].name : key;
const providerLogo = (key: string) =>
  isValidProviderOption(key) ? providerData[key].logoUrl : "";

const addToast = (message: string, tone: "success" | "error" | "info") => {
  const stack = must("toasts");
  const toast = document.createElement("div");
  toast.className = tone === "info" ? "toast" : `toast toast--${tone}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  const close = document.createElement("button");
  close.className = "toast__close";
  close.type = "button";
  close.textContent = "×";
  close.addEventListener("click", () => toast.remove());
  toast.append(close);
  stack.append(toast);
  setTimeout(() => toast.remove(), TOAST_DURATION);
};

const highlightJson = (data: unknown) => {
  const text = JSON.stringify(data, null, 2) ?? "null";

  return escapeHtml(text);
};

const providerLoginHtml = (verb: string) => {
  const featured = FEATURED_LOGIN_PROVIDERS.map(
    (provider) =>
      `<a class="oauth-button" href="${authorizationHref(provider)}">
        <img class="oauth-button__icon" alt="" src="${providerData[provider].logoUrl}" />
        <span class="oauth-button__text">${verb} ${providerData[provider].name}</span>
      </a>`,
  ).join("");
  const options = providerOptions
    .map(
      (provider) =>
        `<option value="${provider}">${escapeHtml(providerData[provider].name)}</option>`,
    )
    .join("");

  return `<div class="oauth-grid">
    ${featured}
    <div class="separator"><span class="separator__line"></span><span class="separator__text">or any provider</span><span class="separator__line"></span></div>
    <select class="provider-select" data-role="provider-select">
      <option value="">Select a provider…</option>${options}
    </select>
    <a class="oauth-button oauth-button--disabled" data-role="provider-go" aria-disabled="true">
      <span class="oauth-button__text">Choose a provider above</span>
    </a>
  </div>`;
};

const scopeListHtml = (scopes: string[]) =>
  scopes
    .map((scope) => `<span class="scope">${escapeHtml(scope)}</span>`)
    .join("");

const identityPanelHtml = () => {
  if (!identityPayload) {
    return `<p class="muted">Loading identities…</p>`;
  }

  const pending = identityPayload.mergeRequests.filter(
    (req) => req.status === "pending",
  );
  const mergesHtml =
    pending.length === 0
      ? ""
      : `<div class="stack"><h3 class="provider-heading">Merge requests</h3><div class="entity-list">${pending
          .map(
            (req) =>
              `<div class="entity card--danger">
                <div class="entity__meta">
                  <span class="entity__title">${escapeHtml(providerLabel(req.conflicting_auth_provider))} conflict</span>
                  <span class="entity__sub">Subject ${escapeHtml(req.conflicting_provider_subject)}</span>
                </div>
                <div class="entity__actions">
                  <button class="btn btn--primary btn--sm" type="button" data-action="merge" data-id="${req.id}">Merge</button>
                  <button class="btn btn--ghost btn--sm" type="button" data-action="dismiss" data-id="${req.id}">Dismiss</button>
                </div>
              </div>`,
          )
          .join("")}</div></div>`;

  const term = identityQuery.trim().toLowerCase();
  const groups = Object.entries(identityPayload.identities)
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

  const groupsHtml =
    groups.length === 0
      ? `<div class="empty-state">No identities match your search.</div>`
      : groups
          .map(
            (group) =>
              `<div class="provider-group">
                <h3 class="provider-heading">${
                  providerLogo(group.provider)
                    ? `<img class="entity__logo" alt="" src="${providerLogo(group.provider)}" />`
                    : ""
                }${escapeHtml(providerLabel(group.provider))}</h3>
                <div class="entity-list">${group.identities
                  .map(
                    (identity) =>
                      `<div class="entity">
                        <div class="entity__main"><div class="entity__meta">
                          <span class="entity__title">${escapeHtml(identity.provider_subject)}${identity.isPrimary ? `<span class="pill pill--primary">Primary</span>` : ""}</span>
                          <span class="entity__sub">${escapeHtml(identity.id)}</span>
                        </div></div>
                        <div class="entity__actions">
                          ${identity.isPrimary ? "" : `<button class="btn btn--neutral btn--sm" type="button" data-action="set-primary" data-id="${identity.id}">Set primary</button>`}
                          <button class="btn btn--danger btn--sm" type="button" data-action="remove-identity" data-id="${identity.id}">Remove</button>
                        </div>
                      </div>`,
                  )
                  .join("")}</div>
              </div>`,
          )
          .join("");

  return `${mergesHtml}
    <input class="search-input" data-role="search" placeholder="Search identities…" value="${escapeHtml(identityQuery)}" />
    ${groupsHtml}`;
};

const connectorsPanelHtml = () => {
  if (!linkedPayload) {
    return `<p class="muted">Loading connectors…</p>`;
  }

  const bindings =
    linkedPayload.bindings.length === 0
      ? `<div class="empty-state">No external accounts linked.</div>`
      : `<div class="entity-list">${linkedPayload.bindings
          .map(
            (binding) =>
              `<div class="entity"><div class="entity__meta">
                <span class="entity__title">${escapeHtml(binding.label ?? binding.externalAccountId)}<span class="pill">${escapeHtml(binding.connectorProvider)}</span></span>
                <span class="entity__sub">${escapeHtml(binding.externalAccountType)} · ${escapeHtml(binding.status)}</span>
                <div class="scope-list">${scopeListHtml(binding.availableScopes)}</div>
              </div><div class="entity__actions"><button class="btn btn--danger btn--sm" type="button" data-action="remove-binding" data-id="${binding.id}">Remove</button></div></div>`,
          )
          .join("")}</div>`;

  const grants =
    linkedPayload.grants.length === 0
      ? `<div class="empty-state">No connector grants yet.</div>`
      : `<div class="entity-list">${linkedPayload.grants
          .map(
            (grant) =>
              `<div class="entity"><div class="entity__meta">
                <span class="entity__title">${escapeHtml(grant.authProviderKey)}<span class="pill pill--indigo">${escapeHtml(grant.status)}</span></span>
                <span class="entity__sub">Subject ${escapeHtml(grant.providerSubject)} · updated ${grant.updatedAt === undefined ? "—" : new Date(grant.updatedAt).toLocaleString()}</span>
                <div class="scope-list">${scopeListHtml(grant.grantedScopes)}</div>
              </div><div class="entity__actions"><button class="btn btn--danger btn--sm" type="button" data-action="remove-grant" data-id="${grant.id}">Remove</button></div></div>`,
          )
          .join("")}</div>`;

  return `<h3 class="provider-heading">External accounts</h3>${bindings}<h3 class="provider-heading">Grants</h3>${grants}`;
};

const renderUserArea = () => {
  const area = must("user-area");
  if (currentUser) {
    const label = currentUser.email ?? currentUser.first_name ?? "Account";
    area.innerHTML = `<span class="muted">${escapeHtml(label)}</span><button class="btn btn--ghost btn--sm" type="button" data-action="signout">Sign out</button>`;
  } else {
    area.innerHTML = `<a class="btn btn--primary btn--sm" href="/html">Sign in</a>`;
  }
};

const renderSettingsView = (view: HTMLElement) => {
  if (!currentUser) {
    view.innerHTML = notAuthorizedHtml();

    return;
  }

  const fullName = [currentUser.first_name, currentUser.last_name]
    .filter((part) => typeof part === "string" && part.length > 0)
    .join(" ");
  view.innerHTML = `<section class="auth-section stack">
      <div><h1 class="page-heading">Account settings</h1><p class="muted">Manage the login identities linked to your account.</p></div>
      <div class="grid-2">
        <div class="card"><h2 class="card__title">Canonical account</h2><p class="muted">Absolute Auth keeps one canonical user and links every OAuth identity to it. Conflicting identities raise a merge request.</p></div>
        <div class="card text-left"><h2 class="card__title">Profile fields</h2>
          <div class="spread"><span class="muted">Subject</span><span>${escapeHtml(currentUser.sub)}</span></div>
          <div class="spread"><span class="muted">Name</span><span>${escapeHtml(fullName || "—")}</span></div>
          <div class="spread"><span class="muted">Email</span><span>${escapeHtml(currentUser.email ?? "—")}</span></div>
          <div class="spread"><span class="muted">Primary identity</span><span>${escapeHtml(currentUser.primary_auth_identity_id ?? "—")}</span></div>
        </div>
      </div>
      <div class="card text-left"><h2 class="card__title">Link another login provider</h2><p class="muted">Adds a new way to sign in to this same account.</p><div class="login-card">${providerLoginHtml("Link")}</div></div>
      <div class="panel">
        <div class="panel__header"><div><h2 class="panel__title">Linked login identities</h2><p class="muted">Search, set a primary, remove, or resolve merges.</p></div><button class="btn btn--ghost btn--sm" type="button" data-action="refresh-identities">Refresh</button></div>
        <div id="identity-panel">${identityPanelHtml()}</div>
      </div>
      <div class="card card--danger text-left"><h2 class="card__title">Delete account</h2><p class="muted">Permanently removes your user, all linked identities, and connector grants. This cannot be undone.</p><button class="btn btn--danger" type="button" data-action="open-delete">Delete account</button></div>
      <dialog class="auth-modal" id="delete-dialog">
        <h3 class="auth-modal__title">Delete your account?</h3>
        <p class="auth-modal__body">Type <strong>DELETE</strong> to confirm.</p>
        <input class="confirm-input" data-role="confirm" placeholder="DELETE" />
        <div class="auth-modal__actions"><button class="btn btn--ghost" type="button" data-action="close-delete">Cancel</button><button class="btn btn--danger" type="button" data-action="confirm-delete" data-role="confirm-button" disabled>Delete account</button></div>
      </dialog>
    </section>`;
  if (!identityPayload) {
    void loadIdentities();
  }
};

const renderConnectorsView = (view: HTMLElement) => {
  if (!currentUser) {
    view.innerHTML = notAuthorizedHtml();

    return;
  }

  const targets = CONNECTOR_TARGETS.map(
    (target) =>
      `<div class="card text-left"><h2 class="card__title row"><img class="entity__logo" alt="" src="${providerData[target.provider].logoUrl}" />${target.label}</h2><p class="muted">${escapeHtml(target.description)}</p><a class="btn btn--primary" href="${authorizationHref(target.provider, "connector")}">Link ${target.label}</a></div>`,
  ).join("");
  view.innerHTML = `<section class="auth-section stack">
      <div><h1 class="page-heading">Connectors</h1><p class="muted">Link external accounts to grant the demo extra data scopes.</p></div>
      <div class="grid-2">${targets}</div>
      <div class="panel"><div class="panel__header"><div><h2 class="panel__title">Linked connectors</h2><p class="muted">OAuth grants and discovered external accounts.</p></div><button class="btn btn--ghost btn--sm" type="button" data-action="refresh-connectors">Refresh</button></div><div id="connector-panel">${connectorsPanelHtml()}</div></div>
    </section>`;
  if (!linkedPayload) {
    void loadConnectors();
  }
};

const renderView = () => {
  const view = must("view");
  const path = window.location.pathname;

  if (path === "/html/protected") {
    view.innerHTML = currentUser
      ? `<section class="auth-section stack"><div><h1 class="page-heading">Protected page</h1><p class="muted">Your authenticated session resolves to this user record.</p></div><pre class="json">${highlightJson(currentUser)}</pre></section>`
      : notAuthorizedHtml();

    return;
  }

  if (path === "/html/settings") {
    renderSettingsView(view);

    return;
  }

  if (path === "/html/connectors") {
    renderConnectorsView(view);

    return;
  }

  view.innerHTML = currentUser
    ? `<section class="auth-content"><h1 class="page-heading">Absolute Auth — HTML</h1><p class="muted">You are signed in as ${escapeHtml(currentUser.email ?? currentUser.sub)}.</p><a class="btn btn--primary" href="/html/protected">View the protected page</a></section>`
    : `<section class="auth-content"><h1 class="page-heading">Absolute Auth — HTML</h1><p class="muted">Sign in or sign up with any OAuth2 provider to test the flow.</p><div class="card login-card text-left">${providerLoginHtml("Sign in with")}</div></section>`;
};

const notAuthorizedHtml = () =>
  `<section class="auth-content"><h1 class="page-heading">Not authorized</h1><p class="muted">You need to sign in to view this page.</p><a class="btn btn--primary" href="/html">Go to sign in</a></section>`;

const refreshIdentityPanel = () => {
  const panel = document.getElementById("identity-panel");
  if (panel) {
    panel.innerHTML = identityPanelHtml();
  }
};

const refreshConnectorPanel = () => {
  const panel = document.getElementById("connector-panel");
  if (panel) {
    panel.innerHTML = connectorsPanelHtml();
  }
};

const loadIdentities = async () => {
  try {
    identityPayload = await fetchAuthIdentities();
    refreshIdentityPanel();
  } catch (caught) {
    addToast(
      caught instanceof Error ? caught.message : "Failed to load identities",
      "error",
    );
  }
};

const loadConnectors = async () => {
  try {
    linkedPayload = await fetchLinkedProviders();
    refreshConnectorPanel();
  } catch (caught) {
    addToast(
      caught instanceof Error ? caught.message : "Failed to load connectors",
      "error",
    );
  }
};

const runIdentity = async (
  action: () => Promise<AuthIdentityPayload>,
  success: string,
) => {
  try {
    identityPayload = await action();
    addToast(success, "success");
    refreshIdentityPanel();
  } catch (caught) {
    addToast(
      caught instanceof Error ? caught.message : "Action failed",
      "error",
    );
  }
};

const runConnector = async (
  action: () => Promise<LinkedProviderPayload>,
  success: string,
) => {
  try {
    linkedPayload = await action();
    addToast(success, "success");
    refreshConnectorPanel();
  } catch (caught) {
    addToast(
      caught instanceof Error ? caught.message : "Action failed",
      "error",
    );
  }
};

const closestAction = (target: EventTarget | null) =>
  target instanceof Element ? target.closest("[data-action]") : null;

const openDeleteDialog = () => {
  const dialog = document.getElementById("delete-dialog");
  if (dialog instanceof HTMLDialogElement) {
    dialog.showModal();
  }
};

const closeDeleteDialog = () => {
  const dialog = document.getElementById("delete-dialog");
  if (dialog instanceof HTMLDialogElement) {
    dialog.close();
  }
};

const setDeleteConfirmEnabled = (value: string) => {
  const button = document.querySelector('[data-role="confirm-button"]');
  if (button instanceof HTMLButtonElement) {
    button.disabled = value !== "DELETE";
  }
};

const handleClick = (event: MouseEvent) => {
  const trigger = closestAction(event.target);
  if (!(trigger instanceof HTMLElement)) {
    return;
  }
  const { action } = trigger.dataset;
  const id = trigger.dataset.id ?? "";

  if (action === "signout") {
    void signOut().then(() => window.location.assign("/html"));
  } else if (action === "refresh-identities") {
    void loadIdentities();
  } else if (action === "refresh-connectors") {
    void loadConnectors();
  } else if (action === "set-primary") {
    void runIdentity(() => setPrimaryIdentity(id), "Primary identity updated");
  } else if (action === "remove-identity") {
    void runIdentity(() => removeIdentity(id), "Identity removed");
  } else if (action === "merge") {
    void runIdentity(() => mergeAccount(id), "Accounts merged");
  } else if (action === "dismiss") {
    void runIdentity(() => dismissMergeRequest(id), "Merge request dismissed");
  } else if (action === "remove-binding") {
    void runConnector(() => removeBinding(id), "Binding removed");
  } else if (action === "remove-grant") {
    void runConnector(() => removeGrant(id), "Grant removed");
  } else if (action === "open-delete") {
    openDeleteDialog();
  } else if (action === "close-delete") {
    closeDeleteDialog();
  } else if (action === "confirm-delete") {
    void deleteAccount()
      .then(() => {
        addToast("Account deleted", "success");

        return signOut();
      })
      .then(() => window.location.assign("/html"))
      .catch((caught) =>
        addToast(
          caught instanceof Error ? caught.message : "Delete failed",
          "error",
        ),
      );
  }
};

const handleInput = (event: Event) => {
  const { target } = event;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.dataset.role === "search" && target instanceof HTMLInputElement) {
    identityQuery = target.value;
    refreshIdentityPanel();
  } else if (
    target.dataset.role === "confirm" &&
    target instanceof HTMLInputElement
  ) {
    setDeleteConfirmEnabled(target.value);
  }
};

const handleChange = (event: Event) => {
  const { target } = event;
  if (
    !(target instanceof HTMLSelectElement) ||
    target.dataset.role !== "provider-select"
  ) {
    return;
  }
  const link = target.parentElement?.querySelector('[data-role="provider-go"]');
  if (!(link instanceof HTMLAnchorElement)) {
    return;
  }
  const provider = target.value;
  if (provider) {
    link.className = "oauth-button";
    link.href = authorizationHref(provider);
    const verb =
      window.location.pathname === "/html/settings" ? "Link" : "Sign in with";
    link.innerHTML = `<img class="oauth-button__icon" alt="" src="${providerLogo(provider)}" /><span class="oauth-button__text">${verb} ${escapeHtml(providerLabel(provider))}</span>`;
  } else {
    link.className = "oauth-button oauth-button--disabled";
    link.removeAttribute("href");
    link.innerHTML = `<span class="oauth-button__text">Choose a provider above</span>`;
  }
};

const markActiveNav = () => {
  const links = document.querySelectorAll("#nav-links a");
  links.forEach((link) => {
    if (link instanceof HTMLAnchorElement) {
      link.setAttribute(
        "aria-current",
        link.getAttribute("href") === window.location.pathname
          ? "page"
          : "false",
      );
    }
  });
};

const init = async () => {
  must("view").addEventListener("click", handleClick);
  must("view").addEventListener("input", handleInput);
  must("view").addEventListener("change", handleChange);
  markActiveNav();
  currentUser = await fetchAuthStatus();
  renderUserArea();
  renderView();
};

void init();
