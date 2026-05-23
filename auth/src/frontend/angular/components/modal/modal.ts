import { CommonModule } from "@angular/common";
import {
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from "@angular/core";

@Component({
  imports: [CommonModule],
  selector: "auth-modal",
  standalone: true,
  templateUrl: "./modal.html",
})
export class ModalComponent {
  open = input(false);
  readonly closed = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>("dialog");

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) {
        return;
      }
      if (this.open() && !dialog.open) {
        dialog.showModal();
      }
      if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  onClose() {
    this.closed.emit();
  }
}
