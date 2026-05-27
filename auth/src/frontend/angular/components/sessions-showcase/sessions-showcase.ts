// Self-service session management driven directly against authClient.session.{list, revoke}.
// @absolutejs/auth doesn't ship Angular composables; we hand-roll the fetch + signal state.

import { CommonModule } from "@angular/common";
import { afterNextRender, Component, signal } from "@angular/core";
import { authClient } from "../../../shared/authClient";

type SessionRow = {
  createdAt?: number;
  current?: boolean;
  expiresAt?: number;
  id: string;
  ip?: string;
  userAgent?: string;
};

const isSessionRow = (value: unknown): value is SessionRow => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { id?: unknown };

  return typeof candidate.id === "string";
};

@Component({
  imports: [CommonModule],
  selector: "auth-sessions-showcase",
  standalone: true,
  templateUrl: "./sessions-showcase.html",
})
export class SessionsShowcaseComponent {
  readonly sessions = signal<SessionRow[]>([]);
  readonly error = signal<string | null>(null);
  readonly pending = signal(true);

  constructor() {
    afterNextRender(() => this.refresh());
  }

  async refresh() {
    this.pending.set(true);
    this.error.set(null);
    const result = await authClient.sessions.list();
    this.pending.set(false);
    if (result.error) {
      this.error.set(result.error.message);

      return;
    }
    this.sessions.set(
      Array.isArray(result.data) ? result.data.filter(isSessionRow) : [],
    );
  }

  async revoke(id: string) {
    const result = await authClient.sessions.revoke(id);
    if (result.error) {
      this.error.set(result.error.message);

      return;
    }
    void this.refresh();
  }
}
