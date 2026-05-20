import { Component, Input } from "@angular/core";
import { ICON_DEFAULT_SIZE, ICON_BADGE_PADDING } from "../../constants";
import type { ModelCapability } from "../../models";

const ICONS: Record<
  ModelCapability,
  { color: string; label: string; path: string }
> = {
  fast: {
    color: "#eab308",
    label: "Fast",
    path: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  "image-gen": {
    color: "#a855f7",
    label: "Image Gen",
    path: "M21 15V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10m18 0l-6-6m6 6H3m0 0l6-6m-6 6v4h18v-4",
  },
  pdf: {
    color: "#ef4444",
    label: "PDF",
    path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1v5h5M9 13h6m-6 4h6m-6-8h2",
  },
  reasoning: {
    color: "#ec4899",
    label: "Reasoning",
    path: "M12 2a8 8 0 00-3.5 15.2V19a1 1 0 001 1h5a1 1 0 001-1v-1.8A8 8 0 0012 2zm0 12a1 1 0 110-2 1 1 0 010 2zm-1 5h2m-2 2h2",
  },
  "tool-calling": {
    color: "#6366f1",
    label: "Tools",
    path: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.77 3.77z",
  },
  vision: {
    color: "#06b6d4",
    label: "Vision",
    path: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11 3a3 3 0 100-6 3 3 0 000 6z",
  },
};

@Component({
  selector: "app-capability-icon",
  standalone: true,
  template: `
    <span
      class="cap-badge"
      [style.align-items]="'center'"
      [style.background]="icon.color + '18'"
      [style.border-radius]="'4px'"
      [style.display]="'inline-flex'"
      [style.height.px]="bgSize"
      [style.justify-content]="'center'"
      [style.width.px]="bgSize"
      [title]="icon.label"
    >
      <svg
        fill="none"
        [attr.height]="iconSize"
        [attr.stroke]="icon.color"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        [attr.width]="iconSize"
      >
        <path [attr.d]="icon.path" />
      </svg>
    </span>
  `,
})
export class CapabilityIconComponent {
  @Input() capability: ModelCapability = "fast";
  @Input() size?: number;

  get iconSize() {
    return this.size ?? ICON_DEFAULT_SIZE;
  }

  get bgSize() {
    return this.iconSize + ICON_BADGE_PADDING;
  }

  get icon() {
    return ICONS[this.capability];
  }
}
