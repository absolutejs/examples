import { CommonModule } from "@angular/common";
import { Component, input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { providerOptions } from "citra";
import { authorizationHref } from "../../../shared/oauth";
import { providerLabel, providerLogo } from "../../services/provider-display";

@Component({
  imports: [CommonModule, FormsModule],
  selector: "auth-provider-login",
  standalone: true,
  templateUrl: "./provider-login.html",
})
export class ProviderLoginComponent {
  action = input<"login" | "link">("login");
  selected = "";
  readonly featured = ["google", "github", "discord", "facebook"];
  readonly allProviders = providerOptions;

  get verb() {
    return this.action() === "link" ? "Link" : "Sign in with";
  }

  href(provider: string) {
    return authorizationHref(provider);
  }

  logo(provider: string) {
    return providerLogo(provider);
  }

  name(provider: string) {
    return providerLabel(provider);
  }
}
