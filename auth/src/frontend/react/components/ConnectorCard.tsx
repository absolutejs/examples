import type { ProviderOption } from "citra";
import { authorizationHref } from "../../shared/oauth";
import { providerData } from "../../shared/providerData";

type ConnectorCardProps = {
  description: string;
  label: string;
  provider: Lowercase<ProviderOption>;
};

export const ConnectorCard = ({
  description,
  label,
  provider,
}: ConnectorCardProps) => (
  <div className="card text-left">
    <h2 className="card__title row">
      <img
        alt=""
        className="entity__logo"
        src={providerData[provider].logoUrl}
      />
      {label}
    </h2>
    <p className="muted">{description}</p>
    <a
      className="btn btn--primary"
      href={authorizationHref(provider, "connector")}
    >
      Link {label}
    </a>
  </div>
);
