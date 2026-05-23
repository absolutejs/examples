import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { AccountOverviewComponent } from "../account-overview/account-overview";
import { DeleteAccountSectionComponent } from "../delete-account-section/delete-account-section";
import { LinkedAuthIdentitiesPanelComponent } from "../linked-auth-identities-panel/linked-auth-identities-panel";
import { NotAuthorizedComponent } from "../not-authorized/not-authorized";
import { ProviderLoginComponent } from "../provider-login/provider-login";

@Component({
  imports: [
    CommonModule,
    AccountOverviewComponent,
    DeleteAccountSectionComponent,
    LinkedAuthIdentitiesPanelComponent,
    NotAuthorizedComponent,
    ProviderLoginComponent,
  ],
  selector: "auth-settings",
  standalone: true,
  templateUrl: "./settings.html",
})
export class SettingsComponent {
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    if (
      this.route.snapshot.queryParams["notice"] === "identity-already-linked"
    ) {
      this.toast.add(
        "That identity is already linked to your account.",
        "info",
      );
      this.router.navigate(["/settings"]);
    }
  }

  async onDeleted() {
    await this.auth.logout();
    this.router.navigate(["/"]);
  }
}
