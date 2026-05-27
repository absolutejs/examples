import { Route, Routes, useNavigate } from "react-router";
import { useAuthStatus } from "../hooks/useAuthStatus";
import { AuditShowcase } from "./AuditShowcase";
import { Connectors } from "./Connectors";
import { CredentialsShowcase } from "./CredentialsShowcase";
import { Home } from "./Home";
import { IdpShowcase } from "./IdpShowcase";
import { MfaShowcase } from "./MfaShowcase";
import { Navbar } from "./Navbar";
import { NotAuthorized } from "./NotAuthorized";
import { PasskeysShowcase } from "./PasskeysShowcase";
import { PasswordlessShowcase } from "./PasswordlessShowcase";
import { Protected } from "./Protected";
import { SessionsShowcase } from "./SessionsShowcase";
import { Settings } from "./Settings";

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
          <Route element={<MfaShowcase />} path="/react/mfa" />
          <Route
            element={<PasswordlessShowcase />}
            path="/react/passwordless"
          />
          <Route element={<SessionsShowcase />} path="/react/sessions" />
          <Route element={<AuditShowcase />} path="/react/audit" />
          <Route element={<IdpShowcase />} path="/react/idp" />
          <Route element={<NotAuthorized />} path="*" />
        </Routes>
      </main>
    </div>
  );
};
