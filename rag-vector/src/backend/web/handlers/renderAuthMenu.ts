import type { AuthUser } from "../../shared/auth/config";

const loginProviders = [
  {
    href: "/oauth2/google/authorization?client=login",
    iconPath: "/assets/svg/providers/google.svg",
    label: "Google",
  },
  {
    href: "/oauth2/facebook/authorization?client=login",
    iconPath: "/assets/svg/providers/meta.svg",
    label: "Facebook",
  },
];

const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const trigger = (label: string) =>
  [
    '<summary class="demo-auth-trigger">',
    `<span class="demo-auth-trigger-text">${escapeHtml(label)}</span>`,
    '<span aria-hidden="true" class="demo-auth-trigger-chevron">+</span>',
    "</summary>",
  ].join("");

// Server-rendered auth menu for the no-JS HTMX page. Mirrors the React auth menu
// (same `demo-auth-*` classes) but as a native <details> dropdown so it needs no
// script. The signed-in branch is what lets the gated panels load — /demo/auth/htmx
// fires the `ragAuthReady` HX-Trigger only when a session is present, so the page
// never requests auth-only fragments until the user is actually signed in.
export const renderAuthMenu = (user: AuthUser | null) => {
  if (!user) {
    return [
      trigger("Login"),
      '<div class="demo-auth-dropdown">',
      '<div class="demo-auth-account-summary">',
      '<span class="demo-auth-kicker">AbsoluteJS account</span>',
      "<strong>Sign in to unlock operations and admin tools</strong>",
      "<span>Use the same account you linked Gmail, Google Contacts, or Meta bindings to in the auth example.</span>",
      "</div>",
      '<div class="demo-auth-provider-list">',
      loginProviders
        .map((provider) =>
          [
            `<a class="demo-auth-provider-button" href="${provider.href}">`,
            `<img alt="" aria-hidden="true" src="${provider.iconPath}" />`,
            `<span>Continue with ${escapeHtml(provider.label)}</span>`,
            "</a>",
          ].join(""),
        )
        .join(""),
      "</div>",
      "</div>",
    ].join("");
  }

  const fullName = [user.first_name, user.last_name]
    .filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    )
    .join(" ")
    .trim();
  const label = fullName || user.email || "Account";

  return [
    trigger(label),
    '<div class="demo-auth-dropdown">',
    '<div class="demo-auth-account-summary">',
    '<span class="demo-auth-kicker">AbsoluteJS account</span>',
    `<strong>${escapeHtml(label)}</strong>`,
    user.email ? `<span>${escapeHtml(user.email)}</span>` : "",
    "</div>",
    '<a class="demo-auth-provider-button demo-auth-provider-button-secondary" href="/demo/signout"><span>Sign out</span></a>',
    "</div>",
  ].join("");
};
