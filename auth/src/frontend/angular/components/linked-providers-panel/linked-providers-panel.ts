import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import {
  fetchLinkedProviders,
  removeBinding,
  removeGrant,
} from "../../../shared/authClient";
import type { LinkedProviderPayload } from "../../../shared/types";
import { ToastService } from "../../services/toast.service";

@Component({
  imports: [CommonModule],
  selector: "auth-linked-providers-panel",
  standalone: true,
  templateUrl: "./linked-providers-panel.html",
})
export class LinkedProvidersPanelComponent {
  private readonly toast = inject(ToastService);

  readonly payload = signal<LinkedProviderPayload | null>(null);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly removeBinding = removeBinding;
  readonly removeGrant = removeGrant;

  constructor() {
    void this.refresh();
  }

  formatTime(value: number | undefined) {
    return value === undefined ? "—" : new Date(value).toLocaleString();
  }

  async refresh() {
    this.error.set(null);
    try {
      this.payload.set(await fetchLinkedProviders());
    } catch (caught) {
      this.error.set(
        caught instanceof Error ? caught.message : "Failed to load connectors",
      );
    }
  }

  async run(
    id: string,
    action: Promise<LinkedProviderPayload>,
    success: string,
  ) {
    this.busyId.set(id);
    try {
      this.payload.set(await action);
      this.toast.add(success, "success");
    } catch (caught) {
      this.toast.add(
        caught instanceof Error ? caught.message : "Action failed",
        "error",
      );
    } finally {
      this.busyId.set(null);
    }
  }
}
