import { Route, Routes, useNavigate } from "react-router";
import { useAuthStatus } from "../hooks/useAuthStatus";
import { Connectors } from "./Connectors";
import { Home } from "./Home";
import { Navbar } from "./Navbar";
import { NotAuthorized } from "./NotAuthorized";
import { Protected } from "./Protected";
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
          <Route element={<NotAuthorized />} path="*" />
        </Routes>
      </main>
    </div>
  );
};
