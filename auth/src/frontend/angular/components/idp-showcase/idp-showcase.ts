// The example app is now an OAuth2/OIDC identity provider (provisioned by the oidc
// block in showcaseBlocks.ts). This page reads the public discovery document + JWKS
// so a developer can see what their app is publishing, and links to the DCR endpoint
// for registering RPs programmatically.

import { CommonModule } from "@angular/common";
import { afterNextRender, Component, computed, signal } from "@angular/core";

type DiscoveryDoc = Record<string, unknown> | null;
type Jwks = { keys: unknown[] };

const DCR_EXAMPLE = `curl -X POST /oauth2/register \\
  -H 'content-type: application/json' \\
  -d '{
    "client_name": "Acme RP",
    "redirect_uris": ["https://acme.example/cb"],
    "grant_types": ["authorization_code", "refresh_token"]
  }'`;

@Component({
  imports: [CommonModule],
  selector: "auth-idp-showcase",
  standalone: true,
  templateUrl: "./idp-showcase.html",
})
export class IdpShowcaseComponent {
  readonly dcrExample = DCR_EXAMPLE;
  readonly discovery = signal<DiscoveryDoc>(null);
  readonly jwks = signal<Jwks | null>(null);
  readonly error = signal<string | null>(null);

  readonly discoveryJson = computed(() => {
    const value = this.discovery();

    return value === null ? null : JSON.stringify(value, null, 2);
  });

  readonly jwksJson = computed(() => {
    const value = this.jwks();

    return value === null ? null : JSON.stringify(value, null, 2);
  });

  readonly jwksKeyCount = computed(() => this.jwks()?.keys.length ?? "?");

  constructor() {
    afterNextRender(() => this.load());
  }

  private async load() {
    try {
      const [discoveryRes, jwksRes] = await Promise.all([
        fetch("/.well-known/openid-configuration"),
        fetch("/oauth2/jwks"),
      ]);
      if (!discoveryRes.ok || !jwksRes.ok) {
        throw new Error("Failed to load IdP metadata");
      }
      this.discovery.set((await discoveryRes.json()) as DiscoveryDoc);
      this.jwks.set((await jwksRes.json()) as Jwks);
    } catch (caught) {
      this.error.set(
        caught instanceof Error ? caught.message : "Failed to load",
      );
    }
  }
}
