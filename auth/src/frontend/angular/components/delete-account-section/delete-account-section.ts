import { CommonModule } from "@angular/common";
import { Component, inject, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { deleteAccount } from "../../../shared/authClient";
import { ToastService } from "../../services/toast.service";
import { ModalComponent } from "../modal/modal";

@Component({
  imports: [CommonModule, FormsModule, ModalComponent],
  selector: "auth-delete-account-section",
  standalone: true,
  templateUrl: "./delete-account-section.html",
})
export class DeleteAccountSectionComponent {
  private readonly toast = inject(ToastService);
  readonly deleted = output<void>();

  readonly open = signal(false);
  readonly busy = signal(false);
  confirmText = "";

  close() {
    this.open.set(false);
    this.confirmText = "";
  }

  async confirmDelete() {
    this.busy.set(true);
    try {
      await deleteAccount();
      this.toast.add("Account deleted", "success");
      this.close();
      this.deleted.emit();
    } catch (caught) {
      this.toast.add(
        caught instanceof Error ? caught.message : "Delete failed",
        "error",
      );
    } finally {
      this.busy.set(false);
    }
  }
}
