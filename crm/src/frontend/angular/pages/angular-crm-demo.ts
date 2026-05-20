import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  signal,
} from "@angular/core";
import {
  emptyLead,
  fetchRecentContacts,
  submitLead,
} from "../../shared/browser";
import {
  FRAMEWORKS,
  FRAMEWORK_DESCRIPTIONS,
  FRAMEWORK_SNIPPETS,
  PAGE_HEADLINE,
  PAGE_SUBHEADLINE,
  PAGE_TAGLINE,
  formatRelativeTime,
  type LeadFormPayload,
  type SavedContact,
} from "../../../shared/demo";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  selector: "angular-crm-demo",
  standalone: true,
  template: `
    <div class="crm-page">
      <div class="crm-shell">
        <header class="crm-header">
          <div class="crm-header__brand">
            <strong>&#64;absolutejs/crm</strong>
            <span>{{ pageTagline }}</span>
          </div>
          <nav class="crm-nav" aria-label="Frameworks">
            <a
              *ngFor="let framework of frameworks"
              [href]="framework.href"
              [class.is-active]="framework.id === 'angular'"
            >
              {{ framework.label }}
            </a>
          </nav>
        </header>
        <section class="crm-hero">
          <h1>{{ pageHeadline }}</h1>
          <p>{{ pageSubheadline }}</p>
          <p style="margin-top: 0.75rem">
            <strong>Angular: </strong>{{ frameworkDescription }}
          </p>
        </section>
        <div class="crm-grid">
          <div class="crm-card">
            <h2>Lead capture form</h2>
            <form class="crm-form" (submit)="handleSubmit($event)">
              <div class="crm-form__row">
                <label>
                  First name
                  <input
                    name="firstName"
                    [value]="form().firstName"
                    (input)="updateField('firstName', $event)"
                    required
                  />
                </label>
                <label>
                  Last name
                  <input
                    name="lastName"
                    [value]="form().lastName"
                    (input)="updateField('lastName', $event)"
                    required
                  />
                </label>
              </div>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  [value]="form().email"
                  (input)="updateField('email', $event)"
                  required
                />
              </label>
              <div class="crm-form__row">
                <label>
                  Phone
                  <input
                    name="phone"
                    [value]="form().phone"
                    (input)="updateField('phone', $event)"
                  />
                </label>
                <label>
                  Company
                  <input
                    name="company"
                    [value]="form().company"
                    (input)="updateField('company', $event)"
                  />
                </label>
              </div>
              <label>
                Notes
                <textarea
                  name="notes"
                  [value]="form().notes ?? ''"
                  (input)="updateField('notes', $event)"
                  rows="3"
                ></textarea>
              </label>
              <button
                class="crm-form__submit"
                type="submit"
                [disabled]="submitting()"
              >
                {{ submitting() ? "Submitting…" : "Capture lead" }}
              </button>
              <div
                *ngIf="status() as currentStatus"
                [class]="'crm-status is-' + currentStatus.kind"
                role="status"
              >
                {{ currentStatus.message }}
              </div>
            </form>
            <pre class="crm-snippet">{{ snippet }}</pre>
          </div>
          <div class="crm-card">
            <h2>Recent contacts</h2>
            <div class="crm-contacts">
              <p *ngIf="contacts().length === 0" style="color: var(--muted)">
                No leads yet — submit the form to see one land here.
              </p>
              <article
                *ngFor="let contact of contacts(); trackBy: trackById"
                class="crm-contact"
              >
                <span class="crm-contact__time">
                  {{ formatTime(contact.createdAt) }}
                </span>
                <div class="crm-contact__name">
                  {{ contact.firstName || "" }}
                  {{ contact.lastName ? " " + contact.lastName : "" }}
                  <ng-container
                    *ngIf="!contact.firstName && !contact.lastName"
                  >
                    (unnamed)
                  </ng-container>
                </div>
                <div class="crm-contact__meta">
                  {{ contact.email || "—" }}
                  <ng-container *ngIf="contact.phone">
                    · {{ contact.phone }}
                  </ng-container>
                  <ng-container *ngIf="contact.company">
                    · {{ contact.company }}
                  </ng-container>
                </div>
              </article>
            </div>
          </div>
        </div>
        <footer class="crm-footer">
          Backed by &#64;absolutejs/crm runtime — same backend for all 6
          framework pages.
        </footer>
      </div>
    </div>
  `,
})
export class AngularCRMDemo implements OnInit, OnDestroy {
  readonly frameworks = FRAMEWORKS;
  readonly frameworkDescription = FRAMEWORK_DESCRIPTIONS.angular;
  readonly snippet = FRAMEWORK_SNIPPETS.angular;
  readonly pageHeadline = PAGE_HEADLINE;
  readonly pageSubheadline = PAGE_SUBHEADLINE;
  readonly pageTagline = PAGE_TAGLINE;

  readonly form = signal<LeadFormPayload>(emptyLead());
  readonly submitting = signal(false);
  readonly status = signal<
    { kind: "success" | "error"; message: string } | null
  >(null);
  readonly contacts = signal<SavedContact[]>([]);

  private intervalRef: ReturnType<typeof setInterval> | null = null;

  trackById = (_index: number, item: SavedContact) => item.id;
  formatTime = (ms: number) => formatRelativeTime(ms);

  ngOnInit() {
    void this.refresh();
    this.intervalRef = setInterval(() => void this.refresh(), 5_000);
  }

  ngOnDestroy() {
    if (this.intervalRef !== null) clearInterval(this.intervalRef);
  }

  updateField(key: keyof LeadFormPayload, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement)
      .value;
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  async refresh() {
    this.contacts.set(await fetchRecentContacts());
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    this.submitting.set(true);
    this.status.set(null);
    const result = await submitLead(this.form());
    this.submitting.set(false);
    if (!result.ok) {
      this.status.set({
        kind: "error",
        message: result.error ?? "Submission failed",
      });
      return;
    }
    this.status.set({
      kind: "success",
      message: `Lead captured (${result.contact?.id ?? "unknown"})`,
    });
    this.form.set(emptyLead());
    await this.refresh();
  }
}

export default AngularCRMDemo;
