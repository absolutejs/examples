import { UniversalRouter } from "@absolutejs/absolute/react";
import { Head } from "@absolutejs/absolute/react/components";
import { Route, Routes, useNavigate } from "react-router";
import { Connectors } from "../components/Connectors";
import { Home } from "../components/Home";
import { Navbar } from "../components/Navbar";
import { NotAuthorized } from "../components/NotAuthorized";
import { Protected } from "../components/Protected";
import { Settings } from "../components/Settings";
import { ToastProvider } from "../components/toast/ToastProvider";
import { useAuthStatus } from "../hooks/useAuthStatus";

type ReactAuthProps = {
  cssPath?: string;
  url?: string;
};

const AuthShell = () => {
  const { handleSignOut, loading, user } = useAuthStatus();
  const navigate = useNavigate();

  const signOutAndHome = async () => {
    await handleSignOut();
    navigate("/react");
  };

  return (
    <>
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
    </>
  );
};

export const ReactAuth = ({ cssPath, url }: ReactAuthProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="AbsoluteJS Auth — React" />
    <body className="auth-body">
      <UniversalRouter url={url}>
        <ToastProvider>
          <AuthShell />
        </ToastProvider>
      </UniversalRouter>
    </body>
  </html>
);
