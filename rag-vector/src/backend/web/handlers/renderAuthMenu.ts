import type { AuthUser } from "../../shared/auth/config";

const GOOGLE_LOGIN_HREF = "/oauth2/google/authorization?client=login";

const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

// Server-rendered auth bar for the no-JS HTMX page. When signed out it offers a
// Google login link; when signed in it shows the account and a sign-out link.
// The signed-in branch is what lets the gated panels load (see /demo/auth/htmx,
// which fires the `ragAuthReady` HX-Trigger), so the page never requests
// auth-only fragments until the session is actually present.
export const renderAuthMenu = (user: AuthUser | null) => {
  if (!user) {
    return [
      '<span class="demo-auth-state">Sign in to unlock operations and admin tools.</span>',
      `<a class="demo-auth-trigger" href="${GOOGLE_LOGIN_HREF}">Sign in with Google</a>`,
    ].join("");
  }

  const fullName = [user.first_name, user.last_name]
    .filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    )
    .join(" ")
    .trim();
  const label = user.email ?? (fullName.length > 0 ? fullName : "your account");

  return [
    `<span class="demo-auth-state">Signed in as <strong>${escapeHtml(label)}</strong></span>`,
    '<a class="demo-auth-trigger demo-auth-signout" href="/demo/signout">Sign out</a>',
  ].join("");
};
