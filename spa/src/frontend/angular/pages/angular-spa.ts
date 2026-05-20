import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import type { Routes } from "@angular/router";
import {
  provideRouter,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";

@Component({
  imports: [CommonModule],
  selector: "spa-home",
  standalone: true,
  template: `
    <h2>Home</h2>
    <p>
      The default sub-route. Click the links in the sidebar — the URL updates,
      this content swaps, and the sidebar + click counter stay mounted.
    </p>
    <p>
      Refresh the page on any sub-route. The server-rendered initial HTML
      already shows the matching view because Angular's adapter forwards the
      request URL into <code>renderApplication</code>.
    </p>
  `,
})
export class HomeView {}

@Component({
  imports: [CommonModule],
  selector: "spa-settings",
  standalone: true,
  template: `
    <h2>Settings</h2>
    <p>
      Each sub-route is a <code>Route</code> registered via
      <code>provideRouter</code>. Angular's router handles the dispatch on both
      server and client.
    </p>
  `,
})
export class SettingsView {}

@Component({
  imports: [CommonModule],
  selector: "spa-profile",
  standalone: true,
  template: `
    <h2>Profile</h2>
    <p>
      Notice the sidebar didn't reload, the click counter above is intact, and
      the URL bar shows <code>/angular/profile</code>. That's intra-framework
      SPA — the framework's own router doing what it already does best.
    </p>
  `,
})
export class ProfileView {}

const routes: Routes = [
  { component: HomeView, path: "angular" },
  { component: SettingsView, path: "angular/settings" },
  { component: ProfileView, path: "angular/profile" },
];

@Component({
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  selector: "angular-spa-page",
  standalone: true,
  template: `
    <header>
      <a href="/" class="logo">
        <img
          src="/assets/png/absolutejs-temp.png"
          height="24"
          alt="AbsoluteJS"
        />
        AbsoluteJS
      </a>
      <nav>
        <a href="/react">React</a>
        <a href="/svelte">Svelte</a>
        <a href="/vue">Vue</a>
        <a href="/angular" class="active">Angular</a>
      </nav>
    </header>

    <main>
      <div class="page-title">
        <img alt="Angular" height="32" src="/assets/svg/angular.svg" />
        <h1>Angular</h1>
        <span class="badge">SPA via @angular/router</span>
      </div>

      <p class="section-desc">
        Refresh on any sub-route — the server renders the right view because the
        page handler forwards <code>request.url</code> into
        <code>renderApplication</code>, and the page registers
        <code>provideRouter</code> in its own <code>providers</code> export.
      </p>

      <div class="portal-state">
        <span>
          Persistent layout state: <strong>{{ currentPath() }}</strong>
        </span>
        <span class="clicks">
          <button (click)="clicks.set(clicks() + 1)">
            Layout clicks: {{ clicks() }}
          </button>
        </span>
      </div>

      <div class="portal-layout">
        <aside class="portal-sidebar">
          <a
            routerLink="/angular"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            Home
          </a>
          <a routerLink="/angular/settings" routerLinkActive="active">
            Settings
          </a>
          <a routerLink="/angular/profile" routerLinkActive="active">
            Profile
          </a>
        </aside>
        <section class="portal-content">
          <router-outlet />
        </section>
      </div>

      <p class="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          AbsoluteJS
        </a>
      </p>
    </main>
  `,
})
export class AngularSpaComponent {
  clicks = signal(0);
  currentPath = signal("/angular");

  private router = inject(Router);

  constructor() {
    this.currentPath.set(this.router.url || "/angular");
    this.router.events.subscribe(() => {
      this.currentPath.set(this.router.url);
    });
  }
}

export const providers = [provideRouter(routes)];

export default AngularSpaComponent;
