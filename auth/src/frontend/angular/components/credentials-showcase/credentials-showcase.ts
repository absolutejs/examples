// Email/password sign-up + sign-in via the createAuthClient SDK. The package owns
// password hashes, breach-check at login, and email-validation rejection at register;
// this UI is purely the consumer's form + flow choices.

import { CommonModule } from "@angular/common";
import { Component, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { authClient } from "../../../shared/authClient";

type Mode = "register" | "signin";

@Component({
  imports: [CommonModule, FormsModule],
  selector: "auth-credentials-showcase",
  standalone: true,
  templateUrl: "./credentials-showcase.html",
})
export class CredentialsShowcaseComponent {
  readonly mode = signal<Mode>("signin");
  readonly email = signal("");
  readonly password = signal("");
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly pending = signal(false);

  readonly submitLabel = computed(() => {
    if (this.pending()) return "Working…";

    return this.mode() === "register" ? "Create account" : "Sign in";
  });

  readonly passwordAutocomplete = computed(() =>
    this.mode() === "register" ? "new-password" : "current-password",
  );

  setMode(value: Mode) {
    this.mode.set(value);
  }

  async submit() {
    this.error.set(null);
    this.notice.set(null);
    this.pending.set(true);

    const credentials = { email: this.email(), password: this.password() };
    const result =
      this.mode() === "register"
        ? await authClient.signUp.email(credentials)
        : await authClient.signIn.email(credentials);

    this.pending.set(false);
    if (result.error) {
      this.error.set(result.error.message);

      return;
    }
    const { data } = result;
    if (data && "passwordCompromised" in data && data.passwordCompromised) {
      this.notice.set(
        "Login succeeded but your password appears in a known breach — reset it from Settings.",
      );

      return;
    }
    if (data && "status" in data && data.status === "mfa_required") {
      this.notice.set(
        "MFA required — open the MFA tab to complete the challenge.",
      );

      return;
    }
    this.notice.set(
      this.mode() === "register"
        ? "Registered — check the server console for the verification email."
        : "Signed in — visit Protected to see your session.",
    );
  }
}
