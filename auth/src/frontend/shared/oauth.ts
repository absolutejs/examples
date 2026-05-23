// Google and Facebook are configured with separate `login` and `connector`
// OAuth clients, so they require an explicit `client` query parameter. Every
// other provider has a single client and needs no parameter.
const PROVIDERS_REQUIRING_CLIENT = new Set(["facebook", "google"]);

export type AuthClient = "login" | "connector";

export const authorizationHref = (provider: string, client?: AuthClient) => {
  const resolvedClient =
    client ?? (PROVIDERS_REQUIRING_CLIENT.has(provider) ? "login" : undefined);

  return resolvedClient
    ? `/oauth2/${provider}/authorization?client=${resolvedClient}`
    : `/oauth2/${provider}/authorization`;
};
