import { CommonModule } from "@angular/common";
import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  Injectable,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  type Routes,
} from "@angular/router";
import { isValidProviderOption, providerOptions } from "citra";
import {
  deleteAccount,
  dismissMergeRequest,
  fetchAuthIdentities,
  fetchAuthStatus,
  fetchLinkedProviders,
  mergeAccount,
  removeBinding,
  removeGrant,
  removeIdentity,
  setPrimaryIdentity,
  signOut,
} from "../../shared/authClient";
import { TOAST_DURATION } from "../../shared/constants";
import { CONNECTOR_TARGETS, NAV_ITEMS } from "../../shared/navData";
import { authorizationHref } from "../../shared/oauth";
import { providerData } from "../../shared/providerData";
import type {
  AuthIdentityPayload,
  AuthUser,
  LinkedProviderPayload,
} from "../../shared/types";

export type Context = Record<string, never>;

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: ToastTone };

const providerLabel = (key: string) =>
  isValidProviderOption(key) ? providerData[key].name : key;
const providerLogo = (key: string) =>
  isValidProviderOption(key) ? providerData[key].logoUrl : "";

@Injectable({ providedIn: "root" })
export class AuthService {
  readonly user = signal<AuthUser | null>(null);
  readonly loading = signal(true);
  private started = false;

  async refresh() {
    this.loading.set(true);
    this.user.set(await fetchAuthStatus());
    this.loading.set(false);
  }

  start() {
    if (this.started) {
      return;
    }
    this.started = true;
    void this.refresh();
  }

  async logout() {
    await signOut();
    this.user.set(null);
  }
}

@Injectable({ providedIn: "root" })
export class ToastService {
  readonly items = signal<ToastItem[]>([]);

  remove(id: number) {
    this.items.update((current) => current.filter((item) => item.id !== id));
  }

  add(message: string, tone: ToastTone = "info") {
    const id = Date.now() + Math.random();
    this.items.update((current) => [...current, { id, message, tone }]);
    setTimeout(() => this.remove(id), TOAST_DURATION);
  }
}

@Component({
  imports: [RouterLink],
  selector: "auth-not-authorized",
  standalone: true,
  template: `
    <section class="auth-content">
      <h1 class="page-heading">Not authorized</h1>
      <p class="muted">You need to sign in to view this page.</p>
      <a class="btn btn--primary" routerLink="/">Go to sign in</a>
    </section>
  `,
})
export class NotAuthorizedComponent {}

@Component({
  imports: [CommonModule, FormsModule],
  selector: "auth-provider-login",
  standalone: true,
  template: `
    <div class="oauth-grid">
      @for (provider of featured; track provider) {
        <a class="oauth-button" [href]="href(provider)">
          <img class="oauth-button__icon" alt="" [src]="logo(provider)" />
          <span class="oauth-button__text">{{ verb }} {{ name(provider) }}</span>
        </a>
      }
      <div class="separator">
        <span class="separator__line"></span>
        <span class="separator__text">or any provider</span>
        <span class="separator__line"></span>
      </div>
      <select class="provider-select" [(ngModel)]="selected">
        <option value="">Select a provider…</option>
        @for (provider of allProviders; track provider) {
          <option [value]="provider">{{ name(provider) }}</option>
        }
      </select>
      @if (selected) {
        <a class="oauth-button" [href]="href(selected)">
          <img class="oauth-button__icon" alt="" [src]="logo(selected)" />
          <span class="oauth-button__text">{{ verb }} {{ name(selected) }}</span>
        </a>
      } @else {
        <span class="oauth-button oauth-button--disabled">
          <span class="oauth-button__text">Choose a provider above</span>
        </span>
      }
    </div>
  `,
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

@Component({
  imports: [CommonModule],
  selector: "auth-json",
  standalone: true,
  template: `<pre class="json">{{ text }}</pre>`,
})
export class HighlightedJsonComponent {
  data = input<unknown>(null);

  get text() {
    return JSON.stringify(this.data(), null, 2) ?? "null";
  }
}

@Component({
  imports: [CommonModule, ProviderLoginComponent, RouterLink],
  selector: "auth-home",
  standalone: true,
  template: `
    <section class="auth-content">
      <h1 class="page-heading">Absolute Auth — Angular</h1>
      @if (auth.user(); as user) {
        <p class="muted">You are signed in as {{ user.email ?? user.sub }}.</p>
        <a class="btn btn--primary" routerLink="/protected">
          View the protected page
        </a>
      } @else {
        <p class="muted">
          Sign in or sign up with any OAuth2 provider to test the flow.
        </p>
        <div class="card login-card text-left">
          <auth-provider-login />
        </div>
      }
    </section>
  `,
})
export class HomeComponent {
  readonly auth = inject(AuthService);
}

@Component({
  imports: [CommonModule, HighlightedJsonComponent, NotAuthorizedComponent],
  selector: "auth-protected",
  standalone: true,
  template: `
    @if (auth.loading()) {
      <section class="auth-content">
        <p class="muted">Checking your session…</p>
      </section>
    } @else if (!auth.user()) {
      <auth-not-authorized />
    } @else {
      <section class="auth-section stack">
        <div>
          <h1 class="page-heading">Protected page</h1>
          <p class="muted">
            Your authenticated session resolves to this user record.
          </p>
        </div>
        <auth-json [data]="auth.user()" />
      </section>
    }
  `,
})
export class ProtectedComponent {
  readonly auth = inject(AuthService);
}

@Component({
  imports: [
    CommonModule,
    FormsModule,
    NotAuthorizedComponent,
    ProviderLoginComponent,
  ],
  selector: "auth-settings",
  standalone: true,
  template: `
    @if (auth.loading()) {
      <section class="auth-content">
        <p class="muted">Checking your session…</p>
      </section>
    } @else if (auth.user(); as user) {
      <section class="auth-section stack">
        <div>
          <h1 class="page-heading">Account settings</h1>
          <p class="muted">Manage the login identities linked to your account.</p>
        </div>

        <div class="grid-2">
          <div class="card">
            <h2 class="card__title">Canonical account</h2>
            <p class="muted">
              Absolute Auth keeps one canonical user and links every OAuth
              identity to it. Conflicting identities raise a merge request.
            </p>
          </div>
          <div class="card text-left">
            <h2 class="card__title">Profile fields</h2>
            <div class="spread">
              <span class="muted">Subject</span><span>{{ user.sub }}</span>
            </div>
            <div class="spread">
              <span class="muted">Name</span><span>{{ fullName(user) || "—" }}</span>
            </div>
            <div class="spread">
              <span class="muted">Email</span><span>{{ user.email ?? "—" }}</span>
            </div>
            <div class="spread">
              <span class="muted">Primary identity</span>
              <span>{{ user.primary_auth_identity_id ?? "—" }}</span>
            </div>
          </div>
        </div>

        <div class="card text-left">
          <h2 class="card__title">Link another login provider</h2>
          <p class="muted">Adds a new way to sign in to this same account.</p>
          <div class="login-card">
            <auth-provider-login [action]="'link'" />
          </div>
        </div>

        <div class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Linked login identities</h2>
              <p class="muted">Search, set a primary, remove, or resolve merges.</p>
            </div>
            <button class="btn btn--ghost btn--sm" type="button" (click)="refresh()">
              Refresh
            </button>
          </div>

          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          @if (pendingMerges().length > 0) {
            <div class="stack">
              <h3 class="provider-heading">Merge requests</h3>
              <div class="entity-list">
                @for (req of pendingMerges(); track req.id) {
                  <div class="entity card--danger">
                    <div class="entity__meta">
                      <span class="entity__title">
                        {{ label(req.conflicting_auth_provider) }} conflict
                      </span>
                      <span class="entity__sub">
                        Subject {{ req.conflicting_provider_subject }}
                      </span>
                    </div>
                    <div class="entity__actions">
                      <button
                        class="btn btn--primary btn--sm"
                        [disabled]="busyId() === req.id"
                        type="button"
                        (click)="
                          run(req.id, mergeAccount(req.id), 'Accounts merged')
                        "
                      >
                        Merge
                      </button>
                      <button
                        class="btn btn--ghost btn--sm"
                        [disabled]="busyId() === req.id"
                        type="button"
                        (click)="
                          run(
                            req.id,
                            dismissMergeRequest(req.id),
                            'Merge request dismissed'
                          )
                        "
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <input
            class="search-input"
            placeholder="Search identities…"
            [(ngModel)]="query"
          />

          @if (payload() && groups().length === 0) {
            <div class="empty-state">No identities match your search.</div>
          }

          @for (group of groups(); track group.provider) {
            <div class="provider-group">
              <h3 class="provider-heading">
                @if (logo(group.provider)) {
                  <img class="entity__logo" alt="" [src]="logo(group.provider)" />
                }
                {{ label(group.provider) }}
              </h3>
              <div class="entity-list">
                @for (identity of group.identities; track identity.id) {
                  <div class="entity">
                    <div class="entity__main">
                      <div class="entity__meta">
                        <span class="entity__title">
                          {{ identity.provider_subject }}
                          @if (identity.isPrimary) {
                            <span class="pill pill--primary">Primary</span>
                          }
                        </span>
                        <span class="entity__sub">{{ identity.id }}</span>
                      </div>
                    </div>
                    <div class="entity__actions">
                      @if (!identity.isPrimary) {
                        <button
                          class="btn btn--neutral btn--sm"
                          [disabled]="busyId() === identity.id"
                          type="button"
                          (click)="
                            run(
                              identity.id,
                              setPrimaryIdentity(identity.id),
                              'Primary identity updated'
                            )
                          "
                        >
                          Set primary
                        </button>
                      }
                      <button
                        class="btn btn--danger btn--sm"
                        [disabled]="busyId() === identity.id"
                        type="button"
                        (click)="
                          run(
                            identity.id,
                            removeIdentity(identity.id),
                            'Identity removed'
                          )
                        "
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <div class="card card--danger text-left">
          <h2 class="card__title">Delete account</h2>
          <p class="muted">
            Permanently removes your user, all linked identities, and connector
            grants. This cannot be undone.
          </p>
          <button class="btn btn--danger" type="button" (click)="deleteOpen.set(true)">
            Delete account
          </button>
        </div>

        <dialog #deleteDialog class="auth-modal" (close)="closeDelete()">
          <h3 class="auth-modal__title">Delete your account?</h3>
          <p class="auth-modal__body">Type <strong>DELETE</strong> to confirm.</p>
          <input class="confirm-input" placeholder="DELETE" [(ngModel)]="confirmText" />
          <div class="auth-modal__actions">
            <button class="btn btn--ghost" type="button" (click)="closeDelete()">
              Cancel
            </button>
            <button
              class="btn btn--danger"
              [disabled]="confirmText !== 'DELETE'"
              type="button"
              (click)="confirmDelete()"
            >
              Delete account
            </button>
          </div>
        </dialog>
      </section>
    } @else {
      <auth-not-authorized />
    }
  `,
})
export class SettingsComponent {
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly payload = signal<AuthIdentityPayload | null>(null);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly deleteOpen = signal(false);
  readonly pendingMerges = signal<AuthIdentityPayload["mergeRequests"]>([]);
  query = "";
  confirmText = "";

  private readonly dialog =
    viewChild<ElementRef<HTMLDialogElement>>("deleteDialog");

  readonly setPrimaryIdentity = setPrimaryIdentity;
  readonly removeIdentity = removeIdentity;
  readonly mergeAccount = mergeAccount;
  readonly dismissMergeRequest = dismissMergeRequest;

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) {
        return;
      }
      if (this.deleteOpen() && !dialog.open) {
        dialog.showModal();
      }
      if (!this.deleteOpen() && dialog.open) {
        dialog.close();
      }
    });

    effect(() => {
      const user = this.auth.user();
      if (user && this.payload() === null) {
        void this.refresh();
      }
    });

    if (
      this.route.snapshot.queryParams["notice"] === "identity-already-linked"
    ) {
      this.toast.add("That identity is already linked to your account.", "info");
      this.router.navigate(["/settings"]);
    }
  }

  label(key: string) {
    return providerLabel(key);
  }

  logo(key: string) {
    return providerLogo(key);
  }

  fullName(user: AuthUser) {
    return [user.first_name, user.last_name]
      .filter((part) => typeof part === "string" && part.length > 0)
      .join(" ");
  }

  groups() {
    const data = this.payload();
    if (!data) {
      return [];
    }
    const term = this.query.trim().toLowerCase();

    return Object.entries(data.identities)
      .map(([provider, identities]) => ({
        identities: identities.filter(
          (identity) =>
            term === "" ||
            providerLabel(provider).toLowerCase().includes(term) ||
            identity.id.toLowerCase().includes(term) ||
            identity.provider_subject.toLowerCase().includes(term),
        ),
        provider,
      }))
      .filter((group) => group.identities.length > 0);
  }

  async refresh() {
    this.error.set(null);
    try {
      const data = await fetchAuthIdentities();
      this.payload.set(data);
      this.pendingMerges.set(
        data.mergeRequests.filter((req) => req.status === "pending"),
      );
    } catch (caught) {
      this.error.set(
        caught instanceof Error ? caught.message : "Failed to load identities",
      );
    }
  }

  async run(id: string, action: Promise<AuthIdentityPayload>, success: string) {
    this.busyId.set(id);
    try {
      const data = await action;
      this.payload.set(data);
      this.pendingMerges.set(
        data.mergeRequests.filter((req) => req.status === "pending"),
      );
      this.toast.add(success, "success");
    } catch (caught) {
      this.toast.add(
        caught instanceof Error ? caught.message : "Action failed",
        "error",
      );
    } finally {
      this.busyId.set(null);
    }
  }

  closeDelete() {
    this.deleteOpen.set(false);
    this.confirmText = "";
  }

  async confirmDelete() {
    try {
      await deleteAccount();
      this.toast.add("Account deleted", "success");
      this.closeDelete();
      await this.auth.logout();
      this.router.navigate(["/"]);
    } catch (caught) {
      this.toast.add(
        caught instanceof Error ? caught.message : "Delete failed",
        "error",
      );
    }
  }
}

@Component({
  imports: [CommonModule, NotAuthorizedComponent],
  selector: "auth-connectors",
  standalone: true,
  template: `
    @if (auth.loading()) {
      <section class="auth-content">
        <p class="muted">Checking your session…</p>
      </section>
    } @else if (auth.user()) {
      <section class="auth-section stack">
        <div>
          <h1 class="page-heading">Connectors</h1>
          <p class="muted">
            Link external accounts to grant the demo extra data scopes.
          </p>
        </div>

        <div class="grid-2">
          @for (target of targets; track target.provider) {
            <div class="card text-left">
              <h2 class="card__title row">
                <img class="entity__logo" alt="" [src]="logo(target.provider)" />
                {{ target.label }}
              </h2>
              <p class="muted">{{ target.description }}</p>
              <a class="btn btn--primary" [href]="connectorHref(target.provider)">
                Link {{ target.label }}
              </a>
            </div>
          }
        </div>

        <div class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Linked connectors</h2>
              <p class="muted">OAuth grants and discovered external accounts.</p>
            </div>
            <button class="btn btn--ghost btn--sm" type="button" (click)="refresh()">
              Refresh
            </button>
          </div>

          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          <h3 class="provider-heading">External accounts</h3>
          @if (payload() && payload()!.bindings.length === 0) {
            <div class="empty-state">No external accounts linked.</div>
          }
          <div class="entity-list">
            @for (binding of payload()?.bindings ?? []; track binding.id) {
              <div class="entity">
                <div class="entity__meta">
                  <span class="entity__title">
                    {{ binding.label ?? binding.externalAccountId }}
                    <span class="pill">{{ binding.connectorProvider }}</span>
                  </span>
                  <span class="entity__sub">
                    {{ binding.externalAccountType }} · {{ binding.status }}
                  </span>
                  <div class="scope-list">
                    @for (scope of binding.availableScopes; track scope) {
                      <span class="scope">{{ scope }}</span>
                    }
                  </div>
                </div>
                <div class="entity__actions">
                  <button
                    class="btn btn--danger btn--sm"
                    [disabled]="busyId() === binding.id"
                    type="button"
                    (click)="
                      run(binding.id, removeBinding(binding.id), 'Binding removed')
                    "
                  >
                    Remove
                  </button>
                </div>
              </div>
            }
          </div>

          <h3 class="provider-heading">Grants</h3>
          @if (payload() && payload()!.grants.length === 0) {
            <div class="empty-state">No connector grants yet.</div>
          }
          <div class="entity-list">
            @for (grant of payload()?.grants ?? []; track grant.id) {
              <div class="entity">
                <div class="entity__meta">
                  <span class="entity__title">
                    {{ grant.authProviderKey }}
                    <span class="pill pill--indigo">{{ grant.status }}</span>
                  </span>
                  <span class="entity__sub">
                    Subject {{ grant.providerSubject }} · updated
                    {{ formatTime(grant.updatedAt) }}
                  </span>
                  <div class="scope-list">
                    @for (scope of grant.grantedScopes; track scope) {
                      <span class="scope">{{ scope }}</span>
                    }
                  </div>
                </div>
                <div class="entity__actions">
                  <button
                    class="btn btn--danger btn--sm"
                    [disabled]="busyId() === grant.id"
                    type="button"
                    (click)="run(grant.id, removeGrant(grant.id), 'Grant removed')"
                  >
                    Remove
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    } @else {
      <auth-not-authorized />
    }
  `,
})
export class ConnectorsComponent {
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly payload = signal<LinkedProviderPayload | null>(null);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly targets = CONNECTOR_TARGETS;

  readonly removeBinding = removeBinding;
  readonly removeGrant = removeGrant;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user && this.payload() === null) {
        void this.refresh();
      }
    });
  }

  logo(key: string) {
    return providerLogo(key);
  }

  connectorHref(provider: string) {
    return authorizationHref(provider, "connector");
  }

  formatTime(value: number | undefined) {
    return value === undefined ? "—" : new Date(value).toLocaleString();
  }

  async refresh() {
    this.error.set(null);
    try {
      this.payload.set(await fetchLinkedProviders());
    } catch (caught) {
      this.error.set(
        caught instanceof Error ? caught.message : "Failed to load connectors",
      );
    }
  }

  async run(id: string, action: Promise<LinkedProviderPayload>, success: string) {
    this.busyId.set(id);
    try {
      this.payload.set(await action);
      this.toast.add(success, "success");
    } catch (caught) {
      this.toast.add(
        caught instanceof Error ? caught.message : "Action failed",
        "error",
      );
    } finally {
      this.busyId.set(null);
    }
  }
}

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
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  selector: "angular-auth-page",
  standalone: true,
  template: `
    <header class="navbar">
      <a class="navbar__brand" routerLink="/">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Absolute Auth
      </a>
      <nav class="navbar__links">
        @for (item of items; track item.path) {
          <a
            class="navbar__link"
            [routerLink]="linkTo(item.path)"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            {{ item.label }}
          </a>
        }
      </nav>
      <div class="navbar__user">
        @if (auth.user(); as user) {
          <span class="muted">{{ user.email ?? user.first_name ?? "Account" }}</span>
          <button class="btn btn--ghost btn--sm" type="button" (click)="signOut()">
            Sign out
          </button>
        } @else {
          <a class="btn btn--primary btn--sm" routerLink="/">Sign in</a>
        }
      </div>
    </header>

    <main class="auth-main">
      <router-outlet />
    </main>

    <div class="toast-stack">
      @for (notice of toast.items(); track notice.id) {
        <div
          [class]="
            notice.tone === 'info' ? 'toast' : 'toast toast--' + notice.tone
          "
        >
          <span>{{ notice.message }}</span>
          <button
            class="toast__close"
            type="button"
            aria-label="Dismiss notification"
            (click)="toast.remove(notice.id)"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
})
export class AngularAuthComponent {
  readonly auth = inject(AuthService);
  readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly items = NAV_ITEMS;

  constructor() {
    afterNextRender(() => this.auth.start());
  }

  linkTo(path: string) {
    return path === "" ? "/" : `/${path}`;
  }

  async signOut() {
    await this.auth.logout();
    this.router.navigate(["/"]);
  }
}

export default AngularAuthComponent;
