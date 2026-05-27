// TOTP enrollment + challenge via authClient.mfa.{setup, verifySetup, challenge}.
// Auto-wires with credentials login when both blocks are enabled: a login attempt
// that returns { status: 'mfa_required' } parks the session until the consumer
// completes a challenge here.

import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { authClient } from "../../../shared/authClient";

type Stage = "challenge" | "idle" | "setup-pending" | "setup-verified";
type SetupData = { secret: string; uri: string };

@Component({
  imports: [CommonModule, FormsModule],
  selector: "auth-mfa-showcase",
  standalone: true,
  templateUrl: "./mfa-showcase.html",
})
export class MfaShowcaseComponent {
  readonly stage = signal<Stage>("idle");
  readonly setup = signal<SetupData | null>(null);
  readonly backupCodes = signal<string[]>([]);
  readonly code = signal("");
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  async startSetup() {
    this.error.set(null);
    this.notice.set(null);
    const result = await authClient.mfa.setup();
    if (result.error) {
      this.error.set(result.error.message);

      return;
    }
    this.setup.set(result.data);
    this.stage.set("setup-pending");
  }

  async verifySetup() {
    this.error.set(null);
    const result = await authClient.mfa.verifySetup({ code: this.code() });
    if (result.error) {
      this.error.set(result.error.message);

      return;
    }
    this.backupCodes.set(result.data.backupCodes);
    this.code.set("");
    this.stage.set("setup-verified");
    this.notice.set("Setup verified. Save the backup codes somewhere safe.");
  }

  async challenge() {
    this.error.set(null);
    const result = await authClient.mfa.challenge({ code: this.code() });
    if (result.error) {
      this.error.set(result.error.message);

      return;
    }
    this.code.set("");
    this.stage.set("idle");
    this.notice.set("MFA challenge passed; session promoted.");
  }

  switchToChallenge() {
    this.stage.set("challenge");
  }

  onSubmit() {
    if (this.stage() === "challenge") {
      void this.challenge();

      return;
    }
    void this.verifySetup();
  }
}
