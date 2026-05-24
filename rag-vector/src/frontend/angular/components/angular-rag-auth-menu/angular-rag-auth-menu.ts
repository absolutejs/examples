import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
} from "@angular/core";
import type { OnDestroy, OnInit } from "@angular/core";

type AuthUser = {
  sub: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  primary_auth_identity_id?: string | null;
};

const loginProviders = [
  {
    href: "/oauth2/google/authorization?client=login",
    iconPath: "/assets/svg/providers/google.svg",
    key: "google",
    label: "Google",
  },
  {
    href: "/oauth2/facebook/authorization?client=login",
    iconPath: "/assets/svg/providers/meta.svg",
    key: "facebook",
    label: "Facebook",
  },
] as const;

function getAccountLabel(user: AuthUser | null): string {
  if (!user) {
    return "Login";
  }
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.email || "Account";
}

@Component({
  selector: "angular-rag-auth-menu",
  standalone: true,
  templateUrl: "./angular-rag-auth-menu.html",
})
export class AngularRAGAuthMenuComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly elementRef = inject(ElementRef);

  isBusy = true;
  isOpen = false;
  user: AuthUser | null = null;
  loginProviders = loginProviders;

  get accountLabel(): string {
    return getAccountLabel(this.user);
  }

  private pointerDownHandler: ((event: PointerEvent) => void) | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  ngOnInit() {
    if (typeof window !== "undefined") {
      void this.loadAuthStatus();
    }
  }

  ngOnDestroy() {
    this.removeDocumentListeners();
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.attachDocumentListeners();
    } else {
      this.removeDocumentListeners();
    }
  }

  async signOut() {
    this.isBusy = true;
    this.cdr.detectChanges();
    try {
      const response = await fetch("/oauth2/signout", { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Sign out failed with status ${response.status}`);
      }
      this.user = null;
      this.isOpen = false;
      this.removeDocumentListeners();
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      this.isBusy = false;
      this.cdr.detectChanges();
    }
  }

  private async loadAuthStatus() {
    try {
      const response = await fetch("/oauth2/status");
      if (!response.ok) {
        this.user = null;

        return;
      }
      const payload = (await response.json()) as { user?: AuthUser | null };
      this.user = payload.user ?? null;
    } catch (error) {
      console.error("Failed to load auth status", error);
      this.user = null;
    } finally {
      this.isBusy = false;
      this.cdr.detectChanges();
    }
  }

  private attachDocumentListeners() {
    const hostEl = this.elementRef.nativeElement as HTMLElement;

    this.pointerDownHandler = (event: PointerEvent) => {
      if (event.target instanceof Node && !hostEl.contains(event.target)) {
        this.isOpen = false;
        this.removeDocumentListeners();
        this.cdr.detectChanges();
      }
    };

    this.keydownHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        this.isOpen = false;
        this.removeDocumentListeners();
        this.cdr.detectChanges();
      }
    };

    document.addEventListener("pointerdown", this.pointerDownHandler);
    document.addEventListener("keydown", this.keydownHandler);
  }

  private removeDocumentListeners() {
    if (this.pointerDownHandler) {
      document.removeEventListener("pointerdown", this.pointerDownHandler);
      this.pointerDownHandler = null;
    }
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
  }
}
