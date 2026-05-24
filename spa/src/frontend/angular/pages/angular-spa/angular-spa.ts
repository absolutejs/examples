import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import type { Routes } from "@angular/router";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { useSubscription } from "@absolutejs/absolute/angular";
import { HomeComponent } from "../../components/home/home";
import { ProfileComponent } from "../../components/profile/profile";
import { SettingsComponent } from "../../components/settings/settings";

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

// Routes are relative to the page's mount. The build statically detects this
// `export const routes` and auto-wires provideRouter(routes) plus the inferred
// `{ provide: APP_BASE_HREF, useValue: "/angular/" }` from the /angular/* mount.
export const routes: Routes = [
  { component: HomeComponent, path: "" },
  { component: SettingsComponent, path: "settings" },
  { component: ProfileComponent, path: "profile" },
];

@Component({
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  selector: "angular-spa-page",
  standalone: true,
  templateUrl: "./angular-spa.html",
})
export class AngularSpaComponent {
  clicks = signal(0);
  currentPath = signal("/");

  private router = inject(Router);

  constructor() {
    this.currentPath.set(this.router.url || "/");
    // useSubscription tears the router-events subscription down with the
    // component (constructor is an injection context, so it captures DestroyRef).
    useSubscription(this.router.events, () => {
      this.currentPath.set(this.router.url);
    });
  }
}

export default AngularSpaComponent;
