import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { CONNECTOR_TARGETS } from "../../../shared/navData";
import { authorizationHref } from "../../../shared/oauth";
import { AuthService } from "../../services/auth.service";
import { providerLogo } from "../../services/provider-display";
import { LinkedProvidersPanelComponent } from "../linked-providers-panel/linked-providers-panel";
import { NotAuthorizedComponent } from "../not-authorized/not-authorized";

@Component({
  imports: [
    CommonModule,
    LinkedProvidersPanelComponent,
    NotAuthorizedComponent,
  ],
  selector: "auth-connectors",
  standalone: true,
  templateUrl: "./connectors.html",
})
export class ConnectorsComponent {
  readonly auth = inject(AuthService);
  readonly targets = CONNECTOR_TARGETS;

  logo(key: string) {
    return providerLogo(key);
  }

  connectorHref(provider: string) {
    return authorizationHref(provider, "connector");
  }
}
