import { CommonModule } from "@angular/common";
import { afterNextRender, Component, inject } from "@angular/core";
import { RouterOutlet, type Routes } from "@angular/router";
import { ConnectorsComponent } from "../../components/connectors/connectors";
import { HomeComponent } from "../../components/home/home";
import { NavbarComponent } from "../../components/navbar/navbar";
import { ProtectedComponent } from "../../components/protected/protected";
import { SettingsComponent } from "../../components/settings/settings";
import { ToastComponent } from "../../components/toast/toast";
import { AuthService } from "../../services/auth.service";

export type Context = Record<string, never>;

// Routes are relative to the page's mount. The build statically detects this
// `export const routes` and auto-wires provideRouter(routes) plus the inferred
// `{ provide: APP_BASE_HREF, useValue: "/angular/" }` from the /angular/* mount.
export const routes: Routes = [
  { component: HomeComponent, path: "" },
  { component: ProtectedComponent, path: "protected" },
  { component: SettingsComponent, path: "settings" },
  { component: ConnectorsComponent, path: "connectors" },
];

@Component({
  imports: [CommonModule, NavbarComponent, RouterOutlet, ToastComponent],
  selector: "angular-auth-page",
  standalone: true,
  styleUrl: "./angular-auth.css",
  templateUrl: "./angular-auth.html",
})
export class AngularAuthComponent {
  readonly auth = inject(AuthService);

  constructor() {
    afterNextRender(() => this.auth.start());
  }
}

export default AngularAuthComponent;
