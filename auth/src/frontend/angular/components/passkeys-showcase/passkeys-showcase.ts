// Passkeys via authClient.passkey.* + WebAuthn helpers. Since @absolutejs/auth
// doesn't ship Angular composables, we drive the conditional-UI autofill and
// upgrade-prompt flows by hand against the SDK.

import { CommonModule } from "@angular/common";
import { afterNextRender, Component, signal } from "@angular/core";
import {
  runConditionalAuthentication,
  runPasskeyRegistration,
} from "@absolutejs/auth/client";
import { authClient } from "../../../shared/authClient";

@Component({
  imports: [CommonModule],
  selector: "auth-passkeys-showcase",
  standalone: true,
  templateUrl: "./passkeys-showcase.html",
})
export class PasskeysShowcaseComponent {
  readonly autofillPending = signal(false);
  readonly autofillSignedIn = signal(false);
  readonly autofillError = signal<string | null>(null);

  readonly upgradePending = signal(true);
  readonly upgradeShouldPrompt = signal(false);
  readonly upgradePasskeys = signal<unknown[] | null>(null);
  readonly upgradeError = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      void this.refreshPasskeys();
      void this.startAutofill();
    });
  }

  private async startAutofill() {
    this.autofillPending.set(true);
    const result = await runConditionalAuthentication(authClient);
    this.autofillPending.set(false);
    if (result.error !== null) {
      // NotAllowed = the user dismissed the platform prompt; not an error.
      if (result.error.message.includes("NotAllowed")) return;
      this.autofillError.set(result.error.message);

      return;
    }
    this.autofillSignedIn.set(true);
  }

  private async refreshPasskeys() {
    this.upgradePending.set(true);
    const result = await authClient.passkeys.list();
    this.upgradePending.set(false);
    if (result.error) {
      this.upgradeError.set(result.error.message);

      return;
    }
    const passkeys = Array.isArray(result.data) ? result.data : [];
    this.upgradePasskeys.set(passkeys);
    this.upgradeShouldPrompt.set(passkeys.length === 0);
  }

  async register() {
    this.upgradeError.set(null);
    const result = await runPasskeyRegistration(authClient);
    if (result.error !== null) {
      if (!result.error.message.includes("NotAllowed")) {
        this.upgradeError.set(result.error.message);
      }

      return;
    }
    void this.refreshPasskeys();
  }
}
