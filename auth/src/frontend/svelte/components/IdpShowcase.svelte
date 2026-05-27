<script lang="ts">
  // The example app is now an OAuth2/OIDC identity provider (provisioned by the oidc
  // block in showcaseBlocks.ts). This page reads the public discovery document + JWKS
  // so a developer can see what their app is publishing, and links to the DCR endpoint
  // for registering RPs programmatically.
  import { onMount } from "svelte";

  type DiscoveryDoc = Record<string, unknown> | null;
  type Jwks = { keys: unknown[] };

  const dcrExample = `curl -X POST /oauth2/register \\
  -H 'content-type: application/json' \\
  -d '{
    "client_name": "Acme RP",
    "redirect_uris": ["https://acme.example/cb"],
    "grant_types": ["authorization_code", "refresh_token"]
  }'`;

  let discovery = $state<DiscoveryDoc>(null);
  let jwks = $state<Jwks | null>(null);
  let error = $state<string | null>(null);

  let jwksKeyCount = $derived(jwks?.keys.length ?? "?");

  onMount(async () => {
    try {
      const [discoveryRes, jwksRes] = await Promise.all([
        fetch("/.well-known/openid-configuration"),
        fetch("/oauth2/jwks"),
      ]);
      if (!discoveryRes.ok || !jwksRes.ok) {
        throw new Error("Failed to load IdP metadata");
      }
      discovery = (await discoveryRes.json()) as DiscoveryDoc;
      jwks = (await jwksRes.json()) as Jwks;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Failed to load";
    }
  });
</script>

<section class="auth-section stack">
  <div>
    <h1 class="page-heading">OAuth2 / OIDC Provider</h1>
    <p class="muted">
      This example app issues OAuth2/OIDC tokens to client apps (RPs)
      configured via Dynamic Client Registration (RFC 7591). The discovery doc
      below is what any RP fetches first; the JWKS publishes the signing public
      key so RPs can verify your tokens locally.
    </p>
  </div>

  {#if error !== null}
    <p class="auth-error" role="alert">{error}</p>
  {/if}

  <div class="stack">
    <h2>Discovery</h2>
    <p class="muted"><code>GET /.well-known/openid-configuration</code></p>
    {#if discovery !== null}
      <pre class="showcase-code">{JSON.stringify(discovery, null, 2)}</pre>
    {/if}
  </div>

  <div class="stack">
    <h2>JWKS</h2>
    <p class="muted">
      <code>GET /oauth2/jwks</code> — {jwksKeyCount} key(s) published.
    </p>
    {#if jwks !== null}
      <pre class="showcase-code">{JSON.stringify(jwks, null, 2)}</pre>
    {/if}
  </div>

  <div class="stack">
    <h2>Register a client (DCR)</h2>
    <p class="muted">
      RFC 7591 — POST your client metadata to <code>/oauth2/register</code> and
      receive a <code>client_id</code> + <code>client_secret</code> +
      <code>registration_access_token</code> for self-service management.
    </p>
    <pre class="showcase-code">{dcrExample}</pre>
  </div>
</section>
