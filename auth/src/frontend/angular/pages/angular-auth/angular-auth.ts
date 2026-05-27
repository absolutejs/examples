import { CommonModule } from "@angular/common";
import { afterNextRender, Component, inject } from "@angular/core";
import { RouterOutlet, type Routes } from "@angular/router";
import { AuditShowcaseComponent } from "../../components/audit-showcase/audit-showcase";
import { ConnectorsComponent } from "../../components/connectors/connectors";
import { CredentialsShowcaseComponent } from "../../components/credentials-showcase/credentials-showcase";
import { HomeComponent } from "../../components/home/home";
import { IdpShowcaseComponent } from "../../components/idp-showcase/idp-showcase";
import { MfaShowcaseComponent } from "../../components/mfa-showcase/mfa-showcase";
import { NavbarComponent } from "../../components/navbar/navbar";
import { PasskeysShowcaseComponent } from "../../components/passkeys-showcase/passkeys-showcase";
import { PasswordlessShowcaseComponent } from "../../components/passwordless-showcase/passwordless-showcase";
import { ProtectedComponent } from "../../components/protected/protected";
import { SessionsShowcaseComponent } from "../../components/sessions-showcase/sessions-showcase";
import { SettingsComponent } from "../../components/settings/settings";
import { ToastComponent } from "../../components/toast/toast";
import { AuthService } from "../../services/auth.service";

export type Context = Record<string, never>;

@Component({
  imports: [CommonModule, NavbarComponent, RouterOutlet, ToastComponent],
  selector: "angular-auth-page",
  standalone: true,
  styleUrl: "./angular-auth.css",
  templateUrl: "./angular-auth.html",
})
class AngularAuthComponent {
  readonly auth = inject(AuthService);

  constructor() {
    afterNextRender(() => this.auth.start());
  }
};

// Routes are relative to the page's mount. The build statically detects this
// `export const routes` and auto-wires provideRouter(routes) plus the inferred
// `{ provide: APP_BASE_HREF, useValue: "/angular/" }` from the /angular/* mount.
export const routes: Routes = [
  { component: HomeComponent, path: "" },
  { component: ProtectedComponent, path: "protected" },
  { component: SettingsComponent, path: "settings" },
  { component: ConnectorsComponent, path: "connectors" },
  { component: CredentialsShowcaseComponent, path: "credentials" },
  { component: PasskeysShowcaseComponent, path: "passkeys" },
  { component: MfaShowcaseComponent, path: "mfa" },
  { component: PasswordlessShowcaseComponent, path: "passwordless" },
  { component: SessionsShowcaseComponent, path: "sessions" },
  { component: AuditShowcaseComponent, path: "audit" },
  { component: IdpShowcaseComponent, path: "idp" },
];

export default AngularAuthComponent;
