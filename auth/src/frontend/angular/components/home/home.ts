import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { ProviderLoginComponent } from "../provider-login/provider-login";

@Component({
  imports: [CommonModule, ProviderLoginComponent, RouterLink],
  selector: "auth-home",
  standalone: true,
  templateUrl: "./home.html",
})
export class HomeComponent {
  readonly auth = inject(AuthService);
}
