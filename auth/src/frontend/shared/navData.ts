import type { ProviderOption } from "citra";

type ConnectorTarget = {
  description: string;
  label: string;
  provider: Lowercase<ProviderOption>;
};

export type FrameworkId =
  | "react"
  | "vue"
  | "svelte"
  | "angular"
  | "html"
  | "htmx";

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
export const FRAMEWORKS: { id: FrameworkId; label: string }[] = [
  { id: "react", label: "React" },
  { id: "vue", label: "Vue" },
  { id: "svelte", label: "Svelte" },
  { id: "angular", label: "Angular" },
  { id: "html", label: "HTML" },
  { id: "htmx", label: "HTMX" },
];
export const NAV_ITEMS: { label: string; path: string }[] = [
  { label: "Home", path: "" },
  { label: "Protected", path: "protected" },
  { label: "Settings", path: "settings" },
  { label: "Connectors", path: "connectors" },
];
