import { Component, Input, Output, EventEmitter, signal } from "@angular/core";
import { NgClass } from "@angular/common";

export type SuggestionCategory = {
  icon: string;
  label: string;
  prompts: string[];
};

@Component({
  imports: [NgClass],
  selector: "app-empty-state",
  standalone: true,
  template: `
    <div class="empty-state">
      <p class="welcome-text">What can I help you with?</p>
      <ng-content></ng-content>
      <div class="suggestions">
        <div class="suggestion-pills">
          @for (cat of suggestions; track cat.label) {
            <button
              class="suggestion-pill"
              [ngClass]="{ active: activeCategory() === cat.label }"
              (click)="
                activeCategory.set(
                  activeCategory() === cat.label ? null : cat.label
                )
              "
              type="button"
            >
              <svg
                fill="none"
                height="14"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="14"
              >
                <path [attr.d]="cat.icon" />
              </svg>
              {{ cat.label }}
            </button>
          }
        </div>
        @if (activeSuggestions()) {
          <div class="suggestion-prompts">
            @for (prompt of activeSuggestions()?.prompts ?? []; track prompt) {
              <button
                class="suggestion"
                (click)="sendMessage.emit(prompt)"
                type="button"
              >
                {{ prompt }}
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() suggestions: SuggestionCategory[] = [];
  @Output() sendMessage = new EventEmitter<string>();

  activeCategory = signal<string | null>(null);

  activeSuggestions = () =>
    this.suggestions.find((cat) => cat.label === this.activeCategory()) ?? null;
}
