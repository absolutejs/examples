import {
  isValidProviderOption,
  type ProviderOption,
  providerOptions,
} from "citra";
import { useState } from "react";
import { FEATURED_LOGIN_PROVIDERS } from "../../shared/navData";
import { authorizationHref } from "../../shared/oauth";
import { providerData } from "../../shared/providerData";

type ProviderLoginProps = {
  action?: "login" | "link";
};

export const ProviderLogin = ({ action = "login" }: ProviderLoginProps) => {
  const [selected, setSelected] = useState("");
  const verb = action === "link" ? "Link" : "Sign in with";
  const labelFor = (provider: Lowercase<ProviderOption>) =>
    `${verb} ${providerData[provider].name}`;

  return (
    <div className="oauth-grid">
      {FEATURED_LOGIN_PROVIDERS.map((provider) => (
        <a
          className="oauth-button" href={authorizationHref(provider)} key={provider}
        >
          <img
            alt=""
            className="oauth-button__icon"
            src={providerData[provider].logoUrl}
          />
          <span className="oauth-button__text">{labelFor(provider)}</span>
        </a>
      ))}

      <div className="separator">
        <span className="separator__line" />
        <span className="separator__text">or any provider</span>
        <span className="separator__line" />
      </div>

      <select
        className="provider-select"
        onChange={(event) => setSelected(event.target.value)}
        value={selected}
      >
        <option value="">Select a provider…</option>
        {providerOptions.map((provider) => (
          <option key={provider} value={provider}>
            {providerData[provider].name}
          </option>
        ))}
      </select>

      {isValidProviderOption(selected) ? (
        <a className="oauth-button" href={authorizationHref(selected)}>
          <img
            alt=""
            className="oauth-button__icon"
            src={providerData[selected].logoUrl}
          />
          <span className="oauth-button__text">{labelFor(selected)}</span>
        </a>
      ) : (
        <span className="oauth-button oauth-button--disabled">
          <span className="oauth-button__text">Choose a provider above</span>
        </span>
      )}
    </div>
  );
};
