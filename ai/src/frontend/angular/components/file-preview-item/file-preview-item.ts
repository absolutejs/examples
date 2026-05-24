import { Component, Input, Output, EventEmitter } from "@angular/core";

export type PendingFile = {
  data: string;
  media_type:
    | "image/png"
    | "image/jpeg"
    | "image/gif"
    | "image/webp"
    | "application/pdf";
  name: string;
  preview: string;
};

@Component({
  selector: "app-file-preview-item",
  standalone: true,
  templateUrl: "./file-preview-item.html",
})
export class FilePreviewItemComponent {
  @Input() file: PendingFile = {
    data: "",
    media_type: "image/png",
    name: "",
    preview: "",
  };
  @Output() remove = new EventEmitter<void>();
}
