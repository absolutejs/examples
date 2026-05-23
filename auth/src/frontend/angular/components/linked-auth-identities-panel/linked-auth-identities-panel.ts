import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  dismissMergeRequest,
  fetchAuthIdentities,
  mergeAccount,
  removeIdentity,
  setPrimaryIdentity,
} from "../../../shared/authClient";
import type { AuthIdentityPayload } from "../../../shared/types";
import { providerLabel, providerLogo } from "../../services/provider-display";
import { ToastService } from "../../services/toast.service";

@Component({
  imports: [CommonModule, FormsModule],
  selector: "auth-linked-auth-identities-panel",
  standalone: true,
  templateUrl: "./linked-auth-identities-panel.html",
})
export class LinkedAuthIdentitiesPanelComponent {
  private readonly toast = inject(ToastService);

  readonly payload = signal<AuthIdentityPayload | null>(null);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly pendingMerges = signal<AuthIdentityPayload["mergeRequests"]>([]);
  query = "";

  readonly setPrimaryIdentity = setPrimaryIdentity;
  readonly removeIdentity = removeIdentity;
  readonly mergeAccount = mergeAccount;
  readonly dismissMergeRequest = dismissMergeRequest;

  constructor() {
    void this.refresh();
  }

  label(key: string) {
    return providerLabel(key);
  }

  logo(key: string) {
    return providerLogo(key);
  }

  groups() {
    const data = this.payload();
    if (!data) {
      return [];
    }
    const term = this.query.trim().toLowerCase();

    return Object.entries(data.identities)
      .map(([provider, identities]) => ({
        identities: identities.filter(
          (identity) =>
            term === "" ||
            providerLabel(provider).toLowerCase().includes(term) ||
            identity.id.toLowerCase().includes(term) ||
            identity.provider_subject.toLowerCase().includes(term),
        ),
        provider,
      }))
      .filter((group) => group.identities.length > 0);
  }

  async refresh() {
    this.error.set(null);
    try {
      const data = await fetchAuthIdentities();
      this.payload.set(data);
      this.pendingMerges.set(
        data.mergeRequests.filter((req) => req.status === "pending"),
      );
    } catch (caught) {
      this.error.set(
        caught instanceof Error ? caught.message : "Failed to load identities",
      );
    }
  }

  async run(id: string, action: Promise<AuthIdentityPayload>, success: string) {
    this.busyId.set(id);
    try {
      const data = await action;
      this.payload.set(data);
      this.pendingMerges.set(
        data.mergeRequests.filter((req) => req.status === "pending"),
      );
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
