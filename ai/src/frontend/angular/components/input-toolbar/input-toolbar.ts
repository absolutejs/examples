import { Component, Input, Output, EventEmitter, signal } from "@angular/core";
import { COST_LABELS, COST_COLORS, type ModelDef } from "../../../models";
import { ModelPickerComponent } from "../model-picker/model-picker";

@Component({
  imports: [ModelPickerComponent],
  selector: "app-input-toolbar",
  standalone: true,
  templateUrl: "./input-toolbar.html",
})
export class InputToolbarComponent {
  @Input() isStreaming = false;
  @Input() selectedModel: ModelDef = {
    capabilities: [],
    cost: "free",
    description: "",
    id: "",
    name: "",
    provider: "openai",
  };
  @Input() supportsAttachments = false;
  @Input() supportsVision = false;
  @Input() supportsPdf = false;
  @Output() attachClick = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() selectModel = new EventEmitter<ModelDef>();

  pickerOpen = signal(false);
  costLabels = COST_LABELS;
  costColors = COST_COLORS;

  get attachTitle() {
    const parts = [
      this.supportsVision ? "image" : "",
      this.supportsPdf ? "PDF" : "",
    ].filter(Boolean);

    return `Attach ${parts.join(" or ")}`;
  }
}
