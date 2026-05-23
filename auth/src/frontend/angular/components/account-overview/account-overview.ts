import { CommonModule } from "@angular/common";
import { Component, input } from "@angular/core";
import type { AuthUser } from "../../../shared/types";

@Component({
  imports: [CommonModule],
  selector: "auth-account-overview",
  standalone: true,
  templateUrl: "./account-overview.html",
})
export class AccountOverviewComponent {
  user = input.required<AuthUser>();

  fullName(user: AuthUser) {
    return [user.first_name, user.last_name]
      .filter((part) => typeof part === "string" && part.length > 0)
      .join(" ");
  }
}
