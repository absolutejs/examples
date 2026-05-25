import {
  isValidProviderOption,
  type ProviderOption,
  providerOptions,
} from "citra";
import { useState } from "react";
import { FEATURED_LOGIN_PROVIDERS } from "../../shared/navData";
import { providerData } from "../../shared/providerData";
import { OAuthButton } from "./OAuthButton";

type ProviderLoginProps = {
  action?: "login" | "link";
  className?: string;
};

export const ProviderLogin = ({
  action = "login",
  className,
}: ProviderLoginProps) => {
  const [selected, setSelected] = useState("");
  const verb = action === "link" ? "Link" : "Sign in with";
  const labelFor = (provider: Lowercase<ProviderOption>) =>
    `${verb} ${providerData[provider].name}`;

  return (
    <div className={["oauth-grid", className].filter(Boolean).join(" ")}>
      {FEATURED_LOGIN_PROVIDERS.map((provider) => (
        <OAuthButton
          key={provider}
          label={labelFor(provider)}
          provider={provider}
        />
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
        <OAuthButton label={labelFor(selected)} provider={selected} />
      ) : (
        <span className="oauth-button oauth-button--disabled">
          <span className="oauth-button__text">Choose a provider above</span>
        </span>
      )}
    </div>
  );
};
