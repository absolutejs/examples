// The example app is now an OAuth2/OIDC identity provider (provisioned by the oidc
// block in showcaseBlocks.ts). This page reads the public discovery document + JWKS
// so a developer can see what their app is publishing, and links to the DCR endpoint
// for registering RPs programmatically.

import { useEffect, useState } from "react";

type DiscoveryDoc = Record<string, unknown> | null;
type Jwks = { keys: unknown[] };

const dcrExample = `curl -X POST /oauth2/register \\
  -H 'content-type: application/json' \\
  -d '{
    "client_name": "Acme RP",
    "redirect_uris": ["https://acme.example/cb"],
    "grant_types": ["authorization_code", "refresh_token"]
  }'`;

export const IdpShowcase = () => {
  const [discovery, setDiscovery] = useState<DiscoveryDoc>(null);
  const [jwks, setJwks] = useState<Jwks | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [discoveryRes, jwksRes] = await Promise.all([
          fetch("/.well-known/openid-configuration"),
          fetch("/oauth2/jwks"),
        ]);
        if (!discoveryRes.ok || !jwksRes.ok) {
          throw new Error("Failed to load IdP metadata");
        }
        const discoveryBody: DiscoveryDoc = await discoveryRes.json();
        const jwksBody: Jwks = await jwksRes.json();
        setDiscovery(discoveryBody);
        setJwks(jwksBody);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed to load");
      }
    };
    void load();
  }, []);

  return (
    <section className="auth-section stack">
      <div>
        <h1 className="page-heading">OAuth2 / OIDC Provider</h1>
        <p className="muted">
          This example app issues OAuth2/OIDC tokens to client apps (RPs)
          configured via Dynamic Client Registration (RFC 7591). The discovery
          doc below is what any RP fetches first; the JWKS publishes the
          signing public key so RPs can verify your tokens locally.
        </p>
      </div>

      {error !== null && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <div className="stack">
        <h2>Discovery</h2>
        <p className="muted">
          <code>GET /.well-known/openid-configuration</code>
        </p>
        {discovery !== null && (
          <pre className="showcase-code">
            {JSON.stringify(discovery, null, 2)}
          </pre>
        )}
      </div>

      <div className="stack">
        <h2>JWKS</h2>
        <p className="muted">
          <code>GET /oauth2/jwks</code> — {jwks?.keys.length ?? "?"} key(s)
          published.
        </p>
        {jwks !== null && (
          <pre className="showcase-code">{JSON.stringify(jwks, null, 2)}</pre>
        )}
      </div>

      <div className="stack">
        <h2>Register a client (DCR)</h2>
        <p className="muted">
          RFC 7591 — POST your client metadata to <code>/oauth2/register</code>{" "}
          and receive a <code>client_id</code> + <code>client_secret</code> +{" "}
          <code>registration_access_token</code> for self-service management.
        </p>
        <pre className="showcase-code">{dcrExample}</pre>
      </div>
    </section>
  );
};
