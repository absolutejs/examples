import { Route, Routes, useNavigate } from "react-router";
import { useAuthStatus } from "../hooks/useAuthStatus";
import { Connectors } from "./Connectors";
import { CredentialsShowcase } from "./CredentialsShowcase";
import { Home } from "./Home";
import { Navbar } from "./Navbar";
import { NotAuthorized } from "./NotAuthorized";
import { PasskeysShowcase } from "./PasskeysShowcase";
import { Protected } from "./Protected";
import { Settings } from "./Settings";
import { ShowcasePlaceholder } from "./ShowcasePlaceholder";

export const AuthShell = () => {
  const { handleSignOut, loading, user } = useAuthStatus();
  const navigate = useNavigate();

  const signOutAndHome = async () => {
    await handleSignOut();
    navigate("/react");
  };

  return (
    <div className="auth-shell">
      <Navbar
        basePath="/react"
        onSignOut={() => void signOutAndHome()}
        user={user}
      />
      <main className="auth-main">
        <Routes>
          <Route element={<Home user={user} />} path="/react" />
          <Route
            element={<Protected loading={loading} user={user} />}
            path="/react/protected"
          />
          <Route
            element={
              <Settings
                loading={loading}
                onDeleted={() => void signOutAndHome()}
                user={user}
              />
            }
            path="/react/settings"
          />
          <Route
            element={<Connectors loading={loading} user={user} />}
            path="/react/connectors"
          />
          <Route
            element={<CredentialsShowcase />}
            path="/react/credentials"
          />
          <Route element={<PasskeysShowcase />} path="/react/passkeys" />
          <Route
            element={
              <ShowcasePlaceholder
                description="TOTP enrollment + challenge. Auto-wires with credentials login when both blocks are configured — the credentials login route parks the session until the MFA verify routes promote it."
                docsHref="https://absolutejs.com/documentation/auth-credentials"
                endpoints={[
                  { method: "POST", path: "/auth/mfa/setup" },
                  { method: "POST", path: "/auth/mfa/verify-setup" },
                  { method: "POST", path: "/auth/mfa/challenge" },
                ]}
                title="MFA (TOTP)"
              />
            }
            path="/react/mfa"
          />
          <Route
            element={
              <ShowcasePlaceholder
                description="Magic-link + OTP sign-in. Tokens log to the server console in this showcase; the verify routes mint the same session as every other flow."
                docsHref="https://absolutejs.com/documentation/auth-passwordless"
                endpoints={[
                  {
                    method: "POST",
                    path: "/auth/passwordless/magic-link/request",
                  },
                  {
                    method: "POST",
                    path: "/auth/passwordless/magic-link/verify",
                  },
                  { method: "POST", path: "/auth/passwordless/otp/request" },
                  { method: "POST", path: "/auth/passwordless/otp/verify" },
                ]}
                title="Passwordless"
              />
            }
            path="/react/passwordless"
          />
          <Route
            element={
              <ShowcasePlaceholder
                description="Self-service session management — GET your active sessions, DELETE a session id to revoke it remotely. Use the useSessions composable from @absolutejs/auth/react."
                docsHref="https://absolutejs.com/documentation/auth-client"
                endpoints={[
                  { method: "GET", path: "/auth/sessions" },
                  { method: "DELETE", path: "/auth/sessions/:id" },
                ]}
                title="Sessions"
              />
            }
            path="/react/sessions"
          />
          <Route
            element={
              <ShowcasePlaceholder
                description="Tamper-evident audit log — every emitted event is hash-chained, verifiable via verifyAuditChain. Events surface here once a small admin endpoint is wired in a follow-up phase."
                docsHref="https://absolutejs.com/documentation/auth-audit-integrity"
                endpoints={[
                  {
                    method: "—",
                    path: "auditStore.list({...}) on the server",
                  },
                  {
                    method: "—",
                    path: "verifyAuditChain(events) on the server",
                  },
                ]}
                title="Audit log integrity"
              />
            }
            path="/react/audit"
          />
          <Route
            element={
              <ShowcasePlaceholder
                description="Your app is now an OAuth2/OIDC identity provider. Discovery exposes the issuer metadata; JWKS publishes the signing public key. Register clients via the DCR endpoint or your own admin tool."
                docsHref="https://absolutejs.com/documentation/auth-oidc-provider"
                endpoints={[
                  {
                    method: "GET",
                    path: "/.well-known/openid-configuration",
                  },
                  { method: "GET", path: "/oauth2/jwks" },
                  { method: "POST", path: "/oauth2/authorize" },
                  { method: "POST", path: "/oauth2/token" },
                  { method: "POST", path: "/oauth2/register" },
                ]}
                title="OAuth2 / OIDC Provider"
              />
            }
            path="/react/idp"
          />
          <Route element={<NotAuthorized />} path="*" />
        </Routes>
      </main>
    </div>
  );
};
