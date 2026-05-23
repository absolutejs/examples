import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import type { AuthUser } from "../../shared/types";
import { AccountOverview } from "./AccountOverview";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { LinkedAuthIdentitiesPanel } from "./LinkedAuthIdentitiesPanel";
import { NotAuthorized } from "./NotAuthorized";
import { ProviderLogin } from "./ProviderLogin";
import { useToast } from "./toast/ToastProvider";

type SettingsProps = {
  loading: boolean;
  onDeleted: () => void;
  user: AuthUser | null;
};

export const Settings = ({ loading, onDeleted, user }: SettingsProps) => {
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("notice") === "identity-already-linked") {
      addToast("That identity is already linked to your account.", "info");
      navigate("/react/settings", { replace: true });
    }
  }, [location.search, addToast, navigate]);

  if (loading) {
    return (
      <section className="auth-content">
        <p className="muted">Checking your session…</p>
      </section>
    );
  }

  if (!user) {
    return <NotAuthorized />;
  }

  return (
    <section className="auth-section stack">
      <div>
        <h1 className="page-heading">Account settings</h1>
        <p className="muted">
          Manage the login identities linked to your account.
        </p>
      </div>
      <AccountOverview user={user} />
      <div className="card text-left">
        <h2 className="card__title">Link another login provider</h2>
        <p className="muted">Adds a new way to sign in to this same account.</p>
        <div className="login-card">
          <ProviderLogin action="link" />
        </div>
      </div>
      <LinkedAuthIdentitiesPanel />
      <DeleteAccountSection onDeleted={onDeleted} />
    </section>
  );
};
