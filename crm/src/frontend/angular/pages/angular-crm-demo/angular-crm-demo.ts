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
} from "../../../shared/browser";
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
} from "../../../../shared/demo";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  selector: "angular-crm-demo",
  standalone: true,
  templateUrl: "./angular-crm-demo.html",
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
  readonly status = signal<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
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
    const { value } = event.target as HTMLInputElement | HTMLTextAreaElement;
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
