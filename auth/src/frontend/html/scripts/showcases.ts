// One file, seven showcase mount functions. The HTML example boots `auth-html.ts`
// which dispatches the URL to a `mount<X>Showcase(view)` here. Each mount stamps
// initial HTML into `#view` and wires its own event listeners; subsequent
// re-renders are confined to a child <div> (e.g. #mfa-result) so we don't tear
// down the listeners.

import {
  runConditionalAuthentication,
  runPasskeyRegistration,
} from "@absolutejs/auth/client";
import { authClient } from "../../shared/authClient";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

// ---------------------------------------------------------------------------
// Credentials — email + password sign-in / sign-up
// ---------------------------------------------------------------------------

export const mountCredentialsShowcase = (view: HTMLElement) => {
  let mode: "register" | "signin" = "signin";
  let pending = false;

  const submitLabel = () =>
    pending ? "Working…" : mode === "register" ? "Create account" : "Sign in";

  const render = () => {
    view.innerHTML = `<section class="auth-section stack">
      <div>
        <h1 class="page-heading">Credentials</h1>
        <p class="muted">Email + password. Backed by <code>&#64;absolutejs/auth</code>'s credentials block: argon2id hashing via <code>Bun.password</code>, HIBP breach check at register + login, disposable-domain rejection via <code>validateEmailDeliverability</code>. Emails (verify + reset) log to the server console.</p>
      </div>
      <div class="stack" style="gap: 12px">
        <div role="tablist" style="display: flex; gap: 8px">
          <button class="button" type="button" data-tab="signin" aria-selected="${mode === "signin"}">Sign in</button>
          <button class="button" type="button" data-tab="register" aria-selected="${mode === "register"}">Register</button>
        </div>
        <form class="stack" style="gap: 12px" data-role="creds-form">
          <label class="stack" style="gap: 4px"><span>Email</span>
            <input name="email" type="email" autocomplete="username webauthn" required />
          </label>
          <label class="stack" style="gap: 4px"><span>Password</span>
            <input name="password" type="password" autocomplete="${mode === "register" ? "new-password" : "current-password"}" minlength="12" required />
          </label>
          <button class="button primary" type="submit" ${pending ? "disabled" : ""}>${submitLabel()}</button>
        </form>
        <div id="creds-result"></div>
      </div>
    </section>`;
  };

  render();

  view.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tab = target.dataset.tab;
    if (tab === "signin" || tab === "register") {
      mode = tab;
      render();
    }
  });

  view.addEventListener("submit", async (event) => {
    if (!(event.target instanceof HTMLFormElement)) return;
    if (event.target.dataset.role !== "creds-form") return;
    event.preventDefault();
    const data = new FormData(event.target);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    pending = true;
    render();

    const result =
      mode === "register"
        ? await authClient.signUp.email({ email, password })
        : await authClient.signIn.email({ email, password });

    pending = false;
    render();
    const status = document.getElementById("creds-result");
    if (!status) return;
    if (result.error) {
      status.innerHTML = `<p class="auth-error" role="alert">${escapeHtml(result.error.message)}</p>`;

      return;
    }
    const { data: success } = result;
    if (
      success &&
      "passwordCompromised" in success &&
      success.passwordCompromised
    ) {
      status.innerHTML = `<p class="muted">Login succeeded but your password appears in a known breach — reset it from Settings.</p>`;

      return;
    }
    if (success && "status" in success && success.status === "mfa_required") {
      status.innerHTML = `<p class="muted">MFA required — open the MFA tab to complete the challenge.</p>`;

      return;
    }
    status.innerHTML = `<p class="muted">${
      mode === "register"
        ? "Registered — check the server console for the verification email."
        : "Signed in — visit Protected to see your session."
    }</p>`;
  });
};

// ---------------------------------------------------------------------------
// Passkeys — conditional autofill + upgrade prompt
// ---------------------------------------------------------------------------

export const mountPasskeysShowcase = async (view: HTMLElement) => {
  view.innerHTML = `<section class="auth-section stack">
    <div>
      <h1 class="page-heading">Passkeys</h1>
      <p class="muted">WebAuthn passkeys. Drives the conditional-UI autofill (<code>runConditionalAuthentication</code>) and registration ceremony (<code>runPasskeyRegistration</code>) from <code>&#64;absolutejs/auth/client</code> directly.</p>
    </div>
    <div class="stack">
      <h2>Conditional-UI sign-in</h2>
      <label class="stack" style="gap: 4px"><span>Email or passkey</span>
        <input autocomplete="username webauthn" placeholder="Tap to see saved passkeys" type="email" />
      </label>
      <div id="passkey-autofill"><p class="muted">Waiting for selection…</p></div>
    </div>
    <div class="stack">
      <h2>Upgrade prompt</h2>
      <div id="passkey-upgrade"><p class="muted">Loading passkeys…</p></div>
    </div>
  </section>`;

  // Kick off autofill + the passkey list in parallel.
  const refreshUpgrade = async () => {
    const upgrade = document.getElementById("passkey-upgrade");
    if (!upgrade) return;
    const list = await authClient.passkeys.list();
    if (list.error) {
      upgrade.innerHTML = `<p class="auth-error" role="alert">${escapeHtml(list.error.message)}</p>`;

      return;
    }
    const passkeys = Array.isArray(list.data) ? list.data : [];
    if (passkeys.length === 0) {
      upgrade.innerHTML = `<div class="stack">
        <p>Save a passkey to this device for faster sign-in next time. One tap, no password to remember.</p>
        <button class="button primary" type="button" data-action="passkey-register">Save a passkey</button>
      </div>`;

      return;
    }
    upgrade.innerHTML = `<p class="muted">You have ${passkeys.length} passkey${passkeys.length === 1 ? "" : "s"} registered.</p>`;
  };

  view.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.action !== "passkey-register") return;
    const result = await runPasskeyRegistration(authClient);
    const upgrade = document.getElementById("passkey-upgrade");
    if (!upgrade) return;
    if (result.error !== null) {
      if (!result.error.message.includes("NotAllowed")) {
        upgrade.innerHTML = `<p class="auth-error" role="alert">${escapeHtml(result.error.message)}</p>`;
      }

      return;
    }
    void refreshUpgrade();
  });

  void refreshUpgrade();
  const autofill = await runConditionalAuthentication(authClient);
  const slot = document.getElementById("passkey-autofill");
  if (!slot) return;
  if (autofill.error !== null) {
    if (autofill.error.message.includes("NotAllowed")) {
      slot.innerHTML = "";

      return;
    }
    slot.innerHTML = `<p class="auth-error" role="alert">${escapeHtml(autofill.error.message)}</p>`;

    return;
  }
  slot.innerHTML = `<p>Signed in via passkey. Visit Protected to see your session.</p>`;
};

// ---------------------------------------------------------------------------
// MFA — TOTP setup / verify / challenge
// ---------------------------------------------------------------------------

export const mountMfaShowcase = (view: HTMLElement) => {
  type Stage = "challenge" | "idle" | "setup-pending" | "setup-verified";
  let stage: Stage = "idle";
  let setup: { secret: string; uri: string } | null = null;
  let backupCodes: string[] = [];
  let error: string | null = null;
  let notice: string | null = null;
  let code = "";

  const render = () => {
    const setupHtml =
      setup === null
        ? ""
        : `<div class="stack" style="gap: 4px">
            <p class="muted">Add this secret to your authenticator app, then enter the 6-digit code below to verify.</p>
            <code style="word-break: break-all">${escapeHtml(setup.uri)}</code>
            <p class="muted">Or paste the raw secret manually: <code>${escapeHtml(setup.secret)}</code></p>
          </div>`;

    const codeFormHtml =
      stage !== "setup-pending" && stage !== "challenge"
        ? ""
        : `<div class="stack" style="gap: 8px">
            <label class="stack" style="gap: 4px"><span>6-digit code</span>
              <input data-role="mfa-code" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*" autocomplete="one-time-code" value="${escapeHtml(code)}" />
            </label>
            <button class="button" type="button" data-action="mfa-submit">${stage === "challenge" ? "Verify challenge" : "Verify setup"}</button>
          </div>`;

    const backupHtml =
      backupCodes.length === 0
        ? ""
        : `<div class="stack" style="gap: 4px">
            <p>Backup codes (one-time use, store them now):</p>
            <ul style="font-family: monospace">${backupCodes.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
          </div>`;

    view.innerHTML = `<section class="auth-section stack">
      <div>
        <h1 class="page-heading">MFA (TOTP)</h1>
        <p class="muted">Time-based one-time passwords (RFC 6238). Setup returns an <code>otpauth://</code> URI you can render as a QR code or paste into any authenticator app. The challenge route promotes a parked session after a successful login.</p>
      </div>
      <div class="stack" style="gap: 12px">
        <h2>Enrollment</h2>
        <button class="button primary" type="button" data-action="mfa-start">Start TOTP setup</button>
        ${setupHtml}
        ${codeFormHtml}
        ${backupHtml}
      </div>
      <div class="stack" style="gap: 8px">
        <h2>Challenge (after a credentials login returned mfa_required)</h2>
        <button class="button" type="button" data-action="mfa-switch-challenge">Switch to challenge mode</button>
      </div>
      ${error === null ? "" : `<p class="auth-error" role="alert">${escapeHtml(error)}</p>`}
      ${notice === null ? "" : `<p class="muted">${escapeHtml(notice)}</p>`}
    </section>`;
  };

  render();

  view.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target.dataset.role !== "mfa-code") return;
    code = event.target.value;
  });

  view.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;

    if (action === "mfa-start") {
      error = null;
      notice = null;
      const result = await authClient.mfa.setup();
      if (result.error) {
        error = result.error.message;
        render();

        return;
      }
      setup = result.data;
      stage = "setup-pending";
      render();
    } else if (action === "mfa-switch-challenge") {
      stage = "challenge";
      render();
    } else if (action === "mfa-submit") {
      error = null;
      if (stage === "challenge") {
        const result = await authClient.mfa.challenge({ code });
        if (result.error) {
          error = result.error.message;
          render();

          return;
        }
        code = "";
        stage = "idle";
        notice = "MFA challenge passed; session promoted.";
      } else {
        const result = await authClient.mfa.verifySetup({ code });
        if (result.error) {
          error = result.error.message;
          render();

          return;
        }
        backupCodes = result.data.backupCodes;
        code = "";
        stage = "setup-verified";
        notice = "Setup verified. Save the backup codes somewhere safe.";
      }
      render();
    }
  });
};

// ---------------------------------------------------------------------------
// Passwordless — magic-link request / verify
// ---------------------------------------------------------------------------

export const mountPasswordlessShowcase = (view: HTMLElement) => {
  let email = "";
  let token = "";
  let requested = false;
  let signedIn = false;
  let error: string | null = null;
  let pending = false;

  const render = () => {
    view.innerHTML = `<section class="auth-section stack">
      <div>
        <h1 class="page-heading">Passwordless (magic link)</h1>
        <p class="muted">Request a magic link, the server logs the token to stdout. Paste it into the second field to verify and sign in. Real deployments wire the <code>onSendMagicLink</code> hook to a mailer.</p>
      </div>
      <div class="stack" style="gap: 12px">
        <h2>Request a magic link</h2>
        <label class="stack" style="gap: 4px"><span>Email</span>
          <input data-role="pwless-email" type="email" autocomplete="email" value="${escapeHtml(email)}" />
        </label>
        <button class="button primary" type="button" data-action="pwless-request" ${pending ? "disabled" : ""}>${pending ? "Sending…" : "Send magic link"}</button>
        ${requested ? `<p class="muted">Request accepted — check the server console for the token.</p>` : ""}
      </div>
      <div class="stack" style="gap: 12px">
        <h2>Verify token</h2>
        <label class="stack" style="gap: 4px"><span>Token from server console</span>
          <input data-role="pwless-token" type="text" placeholder="paste the magic-link token here" value="${escapeHtml(token)}" />
        </label>
        <button class="button" type="button" data-action="pwless-verify" ${pending ? "disabled" : ""}>${pending ? "Verifying…" : "Sign in"}</button>
        ${signedIn ? `<p>Signed in via magic link — visit Protected to see your session.</p>` : ""}
      </div>
      ${error === null ? "" : `<p class="auth-error" role="alert">${escapeHtml(error)}</p>`}
    </section>`;
  };

  render();

  view.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target.dataset.role === "pwless-email") email = event.target.value;
    if (event.target.dataset.role === "pwless-token") token = event.target.value;
  });

  view.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.action === "pwless-request") {
      error = null;
      pending = true;
      render();
      const result = await authClient.passwordless.requestMagicLink({ email });
      pending = false;
      if (result.error) {
        error = result.error.message;
      } else {
        requested = true;
      }
      render();
    } else if (target.dataset.action === "pwless-verify") {
      error = null;
      pending = true;
      render();
      const result = await authClient.passwordless.verifyMagicLink({ token });
      pending = false;
      if (result.error) {
        error = result.error.message;
      } else {
        signedIn = true;
      }
      render();
    }
  });
};

// ---------------------------------------------------------------------------
// Sessions — list + revoke
// ---------------------------------------------------------------------------

type SessionRow = {
  createdAt?: number;
  current?: boolean;
  expiresAt?: number;
  id: string;
  ip?: string;
  userAgent?: string;
};

const isSessionRow = (value: unknown): value is SessionRow => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { id?: unknown };

  return typeof candidate.id === "string";
};

export const mountSessionsShowcase = (view: HTMLElement) => {
  let sessions: SessionRow[] = [];
  let error: string | null = null;
  let pending = true;

  const render = () => {
    const sessionsHtml = sessions
      .map(
        (session) =>
          `<li class="showcase-card--lg">
            <div class="showcase-monospace">${escapeHtml(session.id)}</div>
            ${typeof session.userAgent === "string" ? `<div class="muted">${escapeHtml(session.userAgent)}</div>` : ""}
            ${typeof session.ip === "string" ? `<div class="muted">IP: ${escapeHtml(session.ip)}</div>` : ""}
            <button class="button" type="button" data-action="session-revoke" data-id="${escapeHtml(session.id)}">Revoke</button>
          </li>`,
      )
      .join("");

    view.innerHTML = `<section class="auth-section stack">
      <div>
        <h1 class="page-heading">Sessions</h1>
        <p class="muted">Every active session for the signed-in user. Revoke any device remotely; the affected client's next request returns 401.</p>
      </div>
      <div class="stack">
        <button class="button" type="button" data-action="session-refresh">Refresh</button>
        ${pending ? `<p class="muted">Loading…</p>` : ""}
        ${error === null ? "" : `<p class="auth-error" role="alert">${escapeHtml(error)}</p>`}
        ${!pending && sessions.length === 0 ? `<p class="muted">No active sessions returned (you may not be signed in).</p>` : ""}
        <ul class="stack">${sessionsHtml}</ul>
      </div>
    </section>`;
  };

  const refresh = async () => {
    pending = true;
    error = null;
    render();
    const result = await authClient.sessions.list();
    pending = false;
    if (result.error) {
      error = result.error.message;
    } else {
      sessions = Array.isArray(result.data)
        ? result.data.filter(isSessionRow)
        : [];
    }
    render();
  };

  view.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.action === "session-refresh") {
      void refresh();
    } else if (target.dataset.action === "session-revoke") {
      const id = target.dataset.id;
      if (typeof id !== "string") return;
      const result = await authClient.sessions.revoke(id);
      if (result.error) {
        error = result.error.message;
        render();

        return;
      }
      void refresh();
    }
  });

  void refresh();
};

// ---------------------------------------------------------------------------
// Audit — fetch /api/audit/events + render integrity + events
// ---------------------------------------------------------------------------

type AuditEvent = {
  at: number;
  ip?: string;
  metadata?: Record<string, unknown>;
  type: string;
  userId?: string;
};

type ChainVerification = {
  brokenAt?: number;
  ok: boolean;
  writerId?: string;
}[];

type AuditPayload = {
  events: AuditEvent[];
  verification: ChainVerification;
};

export const mountAuditShowcase = (view: HTMLElement) => {
  let data: AuditPayload | null = null;
  let error: string | null = null;
  let pending = false;

  const render = () => {
    let bodyHtml = "";
    if (data !== null) {
      const integrityHtml = data.verification
        .map(
          (check) =>
            `<li class="${check.ok ? "muted" : "auth-error"}">
              writer=${escapeHtml(check.writerId ?? "—")} ok=${String(check.ok)}
              ${check.brokenAt !== undefined ? ` brokenAt=${escapeHtml(new Date(check.brokenAt).toISOString())}` : ""}
            </li>`,
        )
        .join("");
      const eventsHtml = data.events
        .map(
          (event) =>
            `<li class="showcase-card">
              <div><strong>${escapeHtml(event.type)}</strong> <span class="muted">${escapeHtml(new Date(event.at).toISOString())}</span></div>
              ${event.userId !== undefined ? `<div class="muted">user: ${escapeHtml(event.userId)}</div>` : ""}
              ${event.ip !== undefined ? `<div class="muted">ip: ${escapeHtml(event.ip)}</div>` : ""}
            </li>`,
        )
        .join("");
      bodyHtml = `<h2>Integrity</h2><ul class="showcase-monospace">${integrityHtml}</ul>
        <h2>Recent events (${data.events.length})</h2><ul class="stack">${eventsHtml}</ul>`;
    }

    view.innerHTML = `<section class="auth-section stack">
      <div>
        <h1 class="page-heading">Audit log integrity</h1>
        <p class="muted">Every event emitted by <code>&#64;absolutejs/auth</code> is captured by the tamper-evident sink (<code>createTamperEvidentSink</code> wraps the Neon sink) and hash-chained per writer. <code>verifyAuditChain</code> reports any break.</p>
      </div>
      <div class="stack">
        <button class="button" type="button" data-action="audit-refresh" ${pending ? "disabled" : ""}>${pending ? "Loading…" : "Refresh"}</button>
        ${error === null ? "" : `<p class="auth-error" role="alert">${escapeHtml(error)}</p>`}
        ${bodyHtml}
      </div>
    </section>`;
  };

  const refresh = async () => {
    pending = true;
    error = null;
    render();
    try {
      const response = await fetch("/api/audit/events");
      if (!response.ok) {
        const text = (await response.text()).replace(/^"|"$/g, "");
        throw new Error(text || response.statusText);
      }
      data = (await response.json()) as AuditPayload;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Failed to load";
    } finally {
      pending = false;
      render();
    }
  };

  view.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.action === "audit-refresh") {
      void refresh();
    }
  });

  void refresh();
};

// ---------------------------------------------------------------------------
// IdP — discovery + JWKS + DCR docs
// ---------------------------------------------------------------------------

const DCR_EXAMPLE = `curl -X POST /oauth2/register \\
  -H 'content-type: application/json' \\
  -d '{
    "client_name": "Acme RP",
    "redirect_uris": ["https://acme.example/cb"],
    "grant_types": ["authorization_code", "refresh_token"]
  }'`;

export const mountIdpShowcase = async (view: HTMLElement) => {
  view.innerHTML = `<section class="auth-section stack">
    <div>
      <h1 class="page-heading">OAuth2 / OIDC Provider</h1>
      <p class="muted">This example app issues OAuth2/OIDC tokens to client apps (RPs) configured via Dynamic Client Registration (RFC 7591). The discovery doc below is what any RP fetches first; the JWKS publishes the signing public key so RPs can verify your tokens locally.</p>
    </div>
    <div id="idp-error"></div>
    <div class="stack"><h2>Discovery</h2><p class="muted"><code>GET /.well-known/openid-configuration</code></p><pre id="idp-discovery" class="showcase-code"></pre></div>
    <div class="stack"><h2>JWKS</h2><p class="muted"><code>GET /oauth2/jwks</code> — <span id="idp-jwks-count">?</span> key(s) published.</p><pre id="idp-jwks" class="showcase-code"></pre></div>
    <div class="stack"><h2>Register a client (DCR)</h2><p class="muted">RFC 7591 — POST your client metadata to <code>/oauth2/register</code> and receive a <code>client_id</code> + <code>client_secret</code> + <code>registration_access_token</code> for self-service management.</p><pre class="showcase-code">${escapeHtml(DCR_EXAMPLE)}</pre></div>
  </section>`;

  try {
    const [discoveryRes, jwksRes] = await Promise.all([
      fetch("/.well-known/openid-configuration"),
      fetch("/oauth2/jwks"),
    ]);
    if (!discoveryRes.ok || !jwksRes.ok) {
      throw new Error("Failed to load IdP metadata");
    }
    const discovery: unknown = await discoveryRes.json();
    const jwks: { keys: unknown[] } = await jwksRes.json();
    const discoveryEl = document.getElementById("idp-discovery");
    const jwksEl = document.getElementById("idp-jwks");
    const jwksCount = document.getElementById("idp-jwks-count");
    if (discoveryEl) {
      discoveryEl.textContent = JSON.stringify(discovery, null, 2);
    }
    if (jwksEl) {
      jwksEl.textContent = JSON.stringify(jwks, null, 2);
    }
    if (jwksCount) {
      jwksCount.textContent = String(jwks.keys.length);
    }
  } catch (caught) {
    const slot = document.getElementById("idp-error");
    if (slot) {
      slot.innerHTML = `<p class="auth-error" role="alert">${escapeHtml(caught instanceof Error ? caught.message : "Failed to load")}</p>`;
    }
  }
};
