import { Injectable, signal } from "@angular/core";
import { fetchAuthStatus, signOut } from "../../shared/authClient";
import type { AuthUser } from "../../shared/types";

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
