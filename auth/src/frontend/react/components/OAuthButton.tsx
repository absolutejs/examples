import type { ProviderOption } from "citra";
import { authorizationHref } from "../../shared/oauth";
import { providerData } from "../../shared/providerData";

type OAuthButtonProps = {
  label: string;
  provider: Lowercase<ProviderOption>;
};

export const OAuthButton = ({ label, provider }: OAuthButtonProps) => (
  <a className="oauth-button" href={authorizationHref(provider)}>
    <img
      alt=""
      className="oauth-button__icon"
      src={providerData[provider].logoUrl}
    />
    <span className="oauth-button__text">{label}</span>
  </a>
);
