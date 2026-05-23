import { CONNECTOR_TARGETS } from "../../shared/navData";
import { authorizationHref } from "../../shared/oauth";
import { providerData } from "../../shared/providerData";
import type { AuthUser } from "../../shared/types";
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
          <div className="card text-left" key={target.provider}>
            <h2 className="card__title row">
              <img
                alt=""
                className="entity__logo"
                src={providerData[target.provider].logoUrl}
              />
              {target.label}
            </h2>
            <p className="muted">{target.description}</p>
            <a
              className="btn btn--primary"
              href={authorizationHref(target.provider, "connector")}
            >
              Link {target.label}
            </a>
          </div>
        ))}
      </div>
      <LinkedProvidersPanel />
    </section>
  );
};
