import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { NAV_ITEMS } from "../../../shared/navData";
import { AuthService } from "../../services/auth.service";

@Component({
  imports: [CommonModule, RouterLink, RouterLinkActive],
  selector: "auth-navbar",
  standalone: true,
  templateUrl: "./navbar.html",
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly items = NAV_ITEMS;

  linkTo(path: string) {
    return path === "" ? "/" : `/${path}`;
  }

  async signOut() {
    await this.auth.logout();
    this.router.navigate(["/"]);
  }
}
