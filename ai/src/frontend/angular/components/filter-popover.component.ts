import { Component, Input, Output, EventEmitter } from "@angular/core";
import { NgClass } from "@angular/common";
import { CAPABILITY_LABELS, MODELS, type ModelCapability } from "../../models";
import { CapabilityIconComponent } from "./capability-icon.component";

const CAPABILITY_DESCRIPTIONS: Record<ModelCapability, string> = {
  fast: "Optimized for low latency responses, ideal for real-time applications",
  "image-gen": "Can generate and edit images from text descriptions",
  pdf: "Can read and understand PDF documents uploaded to the conversation",
  reasoning: "Advanced chain-of-thought reasoning for complex logic and math",
  "tool-calling": "Can call external tools and functions to take actions",
  vision: "Can analyze and understand images in the conversation",
};

const ALL_CAPABILITIES: ModelCapability[] = [
  "fast",
  "vision",
  "reasoning",
  "tool-calling",
  "image-gen",
  "pdf",
];

const legacyCount = MODELS.filter((mod) => mod.legacy).length;

@Component({
  imports: [NgClass, CapabilityIconComponent],
  selector: "app-filter-popover",
  standalone: true,
  template: `
    <div
      class="filter-popover"
      [ngClass]="{ closing: closing }"
      (click)="$event.stopPropagation()"
    >
      @for (cap of allCapabilities; track cap) {
        <div class="filter-row">
          <button
            class="filter-option"
            [ngClass]="{ active: capFilters.includes(cap) }"
            (click)="toggleCap.emit(cap)"
            type="button"
          >
            <app-capability-icon [capability]="cap" />
            <span class="filter-option-label">{{ capLabels[cap].label }}</span>
          </button>
          <span class="filter-info" tabindex="0">
            <svg
              fill="none"
              height="12"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="2"
              viewBox="0 0 24 24"
              width="12"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="16" y2="12" />
              <line x1="12" x2="12.01" y1="8" y2="8" />
            </svg>
            <span class="filter-info-tip">{{ capDescriptions[cap] }}</span>
          </span>
        </div>
      }
      <div class="filter-divider"></div>
      <button
        class="filter-option"
        [ngClass]="{ active: showLegacy }"
        (click)="toggleLegacy.emit()"
        type="button"
      >
        <span
          class="cap-badge"
          [style.align-items]="'center'"
          [style.background]="
            showLegacy
              ? 'rgba(136, 136, 136, 0.18)'
              : 'rgba(136, 136, 136, 0.10)'
          "
          [style.border-radius]="'4px'"
          [style.display]="'inline-flex'"
          [style.height.px]="20"
          [style.justify-content]="'center'"
          [style.width.px]="20"
        >
          <svg
            fill="none"
            height="14"
            [attr.stroke]="showLegacy ? '#aaa' : '#666'"
            stroke-linecap="round"
            stroke-width="2"
            viewBox="0 0 24 24"
            width="14"
          >
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <span class="filter-option-label"
          >Legacy models ({{ legacyCount }})</span
        >
      </button>
    </div>
  `,
})
export class FilterPopoverComponent {
  @Input() capFilters: ModelCapability[] = [];
  @Input() closing = false;
  @Input() showLegacy = false;
  @Output() toggleCap = new EventEmitter<ModelCapability>();
  @Output() toggleLegacy = new EventEmitter<void>();

  allCapabilities = ALL_CAPABILITIES;
  capLabels = CAPABILITY_LABELS;
  capDescriptions = CAPABILITY_DESCRIPTIONS;
  legacyCount = legacyCount;
}
