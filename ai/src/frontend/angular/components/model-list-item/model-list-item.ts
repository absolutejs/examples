import { Component, Input, Output, EventEmitter } from "@angular/core";
import { NgClass } from "@angular/common";
import { COST_LABELS, COST_COLORS, type ModelDef } from "../../../models";
import { CapabilityIconComponent } from "../capability-icon/capability-icon";

@Component({
  imports: [NgClass, CapabilityIconComponent],
  selector: "app-model-list-item",
  standalone: true,
  templateUrl: "./model-list-item.html",
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
