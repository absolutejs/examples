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
  templateUrl: "./empty-state.html",
})
export class EmptyStateComponent {
  @Input() suggestions: SuggestionCategory[] = [];
  @Output() sendMessage = new EventEmitter<string>();

  activeCategory = signal<string | null>(null);

  activeSuggestions = () =>
    this.suggestions.find((cat) => cat.label === this.activeCategory()) ?? null;
}
