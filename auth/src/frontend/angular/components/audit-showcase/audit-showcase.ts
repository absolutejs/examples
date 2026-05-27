// Tamper-evident audit log via the showcase admin endpoint /api/audit/events.
// The backend wraps the Neon audit sink in createTamperEvidentSink: every event is
// hash-chained, and verifyAuditChain returns a per-writer integrity report.

import { CommonModule } from "@angular/common";
import { afterNextRender, Component, signal } from "@angular/core";

type AuditEvent = {
  at: number;
  ip?: string;
  metadata?: Record<string, unknown>;
  type: string;
  userId?: string;
};

type ChainVerification = {
  brokenAt?: number;
  ok: boolean;
  writerId?: string;
}[];

type AuditPayload = {
  events: AuditEvent[];
  verification: ChainVerification;
};

@Component({
  imports: [CommonModule],
  selector: "auth-audit-showcase",
  standalone: true,
  templateUrl: "./audit-showcase.html",
})
export class AuditShowcaseComponent {
  readonly data = signal<AuditPayload | null>(null);
  readonly error = signal<string | null>(null);
  readonly pending = signal(false);

  constructor() {
    afterNextRender(() => this.fetchEvents());
  }

  async fetchEvents() {
    this.pending.set(true);
    this.error.set(null);
    try {
      const response = await fetch("/api/audit/events");
      if (!response.ok) {
        const text = (await response.text()).replace(/^"|"$/g, "");
        throw new Error(text || response.statusText);
      }
      this.data.set((await response.json()) as AuditPayload);
    } catch (caught) {
      this.error.set(
        caught instanceof Error ? caught.message : "Failed to load",
      );
    } finally {
      this.pending.set(false);
    }
  }

  isoString(ms: number) {
    return new Date(ms).toISOString();
  }

  trackCheck(_: number, check: ChainVerification[number]) {
    return check.writerId ?? "default";
  }

  trackEvent(_: number, event: AuditEvent) {
    return `${event.at}-${event.type}-${event.userId ?? "anon"}`;
  }
}
