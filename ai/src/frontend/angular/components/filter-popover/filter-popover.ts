import { Component, Input, Output, EventEmitter } from "@angular/core";
import { NgClass } from "@angular/common";
import {
  CAPABILITY_LABELS,
  MODELS,
  type ModelCapability,
} from "../../../models";
import { CapabilityIconComponent } from "../capability-icon/capability-icon";

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
  templateUrl: "./filter-popover.html",
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
