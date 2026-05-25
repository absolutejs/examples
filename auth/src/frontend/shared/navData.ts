import type { ProviderOption } from "citra";

type ConnectorTarget = {
  description: string;
  label: string;
  provider: Lowercase<ProviderOption>;
};

export const CONNECTOR_TARGETS: ConnectorTarget[] = [
  {
    description: "Gmail + Google Contacts read access",
    label: "Google",
    provider: "google",
  },
  {
    description: "Facebook Pages + Instagram business accounts",
    label: "Meta",
    provider: "facebook",
  },
];
export const FEATURED_LOGIN_PROVIDERS: Lowercase<ProviderOption>[] = [
  "google",
  "github",
  "discord",
  "facebook",
];
export const NAV_ITEMS: { label: string; path: string }[] = [
  { label: "Home", path: "" },
  { label: "Protected", path: "protected" },
  { label: "Settings", path: "settings" },
  { label: "Connectors", path: "connectors" },
];
