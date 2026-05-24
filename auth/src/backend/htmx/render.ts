import { resolveAuthHtmxRenderers } from "@absolutejs/auth/ui";
import {
  CONNECTOR_TARGETS,
  FEATURED_LOGIN_PROVIDERS,
} from "../../frontend/shared/navData";
import { authorizationHref } from "../../frontend/shared/oauth";
import { providerData } from "../../frontend/shared/providerData";

// The auth HTMX fragment renderers live in @absolutejs/auth — resolve them with
// this app's provider data, featured providers, connector targets and OAuth href
// builder, then re-export under the names the routes already use. Override any
// fragment by passing `render` to resolveAuthHtmxRenderers.
const renderers = resolveAuthHtmxRenderers({
  authorizationHref,
  connectorTargets: CONNECTOR_TARGETS,
  featuredLoginProviders: FEATURED_LOGIN_PROVIDERS,
  providerData,
});

export const escapeHtml = renderers.escapeHtml;
export const renderAccount = renderers.account;
export const renderAuthMenu = renderers.authMenu;
export const renderConnectorLinks = renderers.connectorLinks;
export const renderConnectors = renderers.connectors;
export const renderIdentities = renderers.identities;
export const renderProtected = renderers.protected;
export const renderProviderLogin = renderers.providerLogin;
