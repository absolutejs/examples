// Magic-link request + verify via authClient.passwordless.{requestMagicLink, verifyMagicLink}.
// The showcase server logs the magic-link token to stdout (no real mailer); paste it
// into the verify field to complete the flow.

import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { authClient } from "../../../shared/authClient";

@Component({
  imports: [CommonModule, FormsModule],
  selector: "auth-passwordless-showcase",
  standalone: true,
  templateUrl: "./passwordless-showcase.html",
})
export class PasswordlessShowcaseComponent {
  readonly email = signal("");
  readonly token = signal("");
  readonly requested = signal(false);
  readonly signedIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly pending = signal(false);

  async request() {
    this.error.set(null);
    this.pending.set(true);
    const result = await authClient.passwordless.requestMagicLink({
      email: this.email(),
    });
    this.pending.set(false);
    if (result.error) {
      this.error.set(result.error.message);

      return;
    }
    this.requested.set(true);
  }

  async verify() {
    this.error.set(null);
    this.pending.set(true);
    const result = await authClient.passwordless.verifyMagicLink({
      token: this.token(),
    });
    this.pending.set(false);
    if (result.error) {
      this.error.set(result.error.message);

      return;
    }
    this.signedIn.set(true);
  }
}
