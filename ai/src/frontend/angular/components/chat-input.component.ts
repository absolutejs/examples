import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { NgClass } from "@angular/common";
import type { ModelDef } from "../../models";
import {
  FilePreviewItemComponent,
  type PendingFile,
} from "./file-preview-item.component";
import { InputToolbarComponent } from "./input-toolbar.component";

@Component({
  imports: [NgClass, FilePreviewItemComponent, InputToolbarComponent],
  selector: "app-chat-input",
  standalone: true,
  template: `
    <form
      class="chat-input-card"
      [ngClass]="{ centered: !hasMessages }"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (submit)="onSubmit($event)"
    >
      @if (pendingFiles.length > 0) {
        <div class="file-previews">
          @for (file of pendingFiles; track $index) {
            <app-file-preview-item
              [file]="file"
              (remove)="removeFile.emit($index)"
            />
          }
        </div>
      }
      <textarea
        #textareaEl
        autocomplete="off"
        [disabled]="isStreaming"
        name="input"
        (keydown)="onKeyDown($event)"
        (paste)="onPaste($event)"
        [placeholder]="hasMessages ? 'Reply...' : 'Ask anything...'"
        [rows]="hasMessages ? 1 : 2"
      ></textarea>
      <input
        #fileInput
        [accept]="acceptTypes"
        multiple
        (change)="onFileChange($event)"
        style="display: none"
        type="file"
      />
      <app-input-toolbar
        [isStreaming]="isStreaming"
        [selectedModel]="selectedModel"
        [supportsAttachments]="supportsAttachments"
        [supportsVision]="supportsVision"
        [supportsPdf]="supportsPdf"
        (attachClick)="fileInput.click()"
        (cancel)="cancelStream.emit()"
        (selectModel)="selectModel.emit($event)"
      />
    </form>
  `,
})
export class ChatInputComponent {
  @Input() hasMessages = false;
  @Input() isStreaming = false;
  @Input() pendingFiles: PendingFile[] = [];
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
  @Output() processFiles = new EventEmitter<FileList | File[]>();
  @Output() removeFile = new EventEmitter<number>();
  @Output() cancelStream = new EventEmitter<void>();
  @Output() selectModel = new EventEmitter<ModelDef>();
  @Output() submitMessage = new EventEmitter<string>();

  @ViewChild("fileInput") fileInput: ElementRef<HTMLInputElement> | undefined;
  @ViewChild("textareaEl") textareaEl:
    | ElementRef<HTMLTextAreaElement>
    | undefined;

  get acceptTypes() {
    const types: string[] = [];
    if (this.supportsVision) {
      types.push("image/png", "image/jpeg", "image/gif", "image/webp");
    }
    if (this.supportsPdf) {
      types.push("application/pdf");
    }

    return types.join(",");
  }

  onDragOver(evt: DragEvent) {
    evt.preventDefault();
    const target: HTMLElement =
      evt.currentTarget instanceof HTMLElement
        ? evt.currentTarget
        : document.createElement("div");
    target.classList.add("drag-over");
  }

  onDragLeave(evt: DragEvent) {
    const target: HTMLElement =
      evt.currentTarget instanceof HTMLElement
        ? evt.currentTarget
        : document.createElement("div");
    target.classList.remove("drag-over");
  }

  onDrop(evt: DragEvent) {
    evt.preventDefault();
    const target: HTMLElement =
      evt.currentTarget instanceof HTMLElement
        ? evt.currentTarget
        : document.createElement("div");
    target.classList.remove("drag-over");
    if (evt.dataTransfer?.files && evt.dataTransfer.files.length > 0) {
      this.processFiles.emit(evt.dataTransfer.files);
    }
  }

  onKeyDown(evt: KeyboardEvent) {
    if (evt.key !== "Enter" || evt.shiftKey) return;
    evt.preventDefault();
    const eventTarget = evt.target instanceof HTMLElement ? evt.target : null;
    const form = eventTarget?.closest("form");
    form?.requestSubmit();
  }

  onPaste(evt: ClipboardEvent) {
    const items = evt.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      const isAttachable =
        item.type.startsWith("image/") || item.type === "application/pdf";
      if (!isAttachable) continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    if (files.length > 0) this.processFiles.emit(files);
  }

  onFileChange(evt: Event) {
    const input = evt.target instanceof HTMLInputElement ? evt.target : null;
    if (!input) return;
    if (input.files) this.processFiles.emit(input.files);
    input.value = "";
  }

  onSubmit(evt: Event) {
    evt.preventDefault();
    const textarea = this.textareaEl?.nativeElement;
    if (!textarea) return;
    const value = textarea.value.trim();
    if (!value) return;
    this.submitMessage.emit(value);
    textarea.value = "";
  }
}
