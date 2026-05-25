import { CONNECTOR_TARGETS } from "../../shared/navData";
import type { AuthUser } from "../../shared/types";
import { ConnectorCard } from "./ConnectorCard";
import { LinkedProvidersPanel } from "./LinkedProvidersPanel";
import { NotAuthorized } from "./NotAuthorized";

type ConnectorsProps = {
  loading: boolean;
  user: AuthUser | null;
};

export const Connectors = ({ loading, user }: ConnectorsProps) => {
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
        <h1 className="page-heading">Connectors</h1>
        <p className="muted">
          Link external accounts to grant the demo extra data scopes.
        </p>
      </div>
      <div className="grid-2">
        {CONNECTOR_TARGETS.map((target) => (
          <ConnectorCard
            description={target.description}
            key={target.provider}
            label={target.label}
            provider={target.provider}
          />
        ))}
      </div>
      <LinkedProvidersPanel />
    </section>
  );
};
