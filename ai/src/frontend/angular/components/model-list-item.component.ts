import { Component, Input, Output, EventEmitter } from "@angular/core";
import { NgClass } from "@angular/common";
import { COST_LABELS, COST_COLORS, type ModelDef } from "../../models";
import { CapabilityIconComponent } from "./capability-icon.component";

@Component({
  imports: [NgClass, CapabilityIconComponent],
  selector: "app-model-list-item",
  standalone: true,
  template: `
    <button
      class="picker-model"
      [ngClass]="{ selected: selected }"
      (click)="select.emit()"
      type="button"
    >
      <div class="picker-model-row">
        <img
          alt=""
          class="picker-model-logo"
          height="16"
          [src]="providerLogoPath + '/' + model.provider + '.svg'"
          width="16"
        />
        <span class="picker-model-name">{{ model.name }}</span>
        <span class="picker-cost" [style.color]="costColors[model.cost]">{{
          costLabels[model.cost]
        }}</span>
        @if (model.legacy) {
          <span class="picker-legacy">legacy</span>
        }
        <div class="picker-cap-icons">
          @for (cap of model.capabilities; track cap) {
            <app-capability-icon [capability]="cap" [size]="12" />
          }
        </div>
      </div>
      <div class="picker-model-desc">{{ model.description }}</div>
    </button>
  `,
})
export class ModelListItemComponent {
  @Input() model: ModelDef = {
    capabilities: [],
    cost: "free",
    description: "",
    id: "",
    name: "",
    provider: "openai",
  };
  @Input() selected = false;
  @Input() providerLogoPath = "/assets/svg/providers";
  @Output() select = new EventEmitter<void>();

  costLabels = COST_LABELS;
  costColors = COST_COLORS;
}
