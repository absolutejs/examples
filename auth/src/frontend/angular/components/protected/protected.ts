import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { AuthService } from "../../services/auth.service";
import { HighlightedJsonComponent } from "../highlighted-json/highlighted-json";
import { NotAuthorizedComponent } from "../not-authorized/not-authorized";

@Component({
  imports: [CommonModule, HighlightedJsonComponent, NotAuthorizedComponent],
  selector: "auth-protected",
  standalone: true,
  templateUrl: "./protected.html",
})
export class ProtectedComponent {
  readonly auth = inject(AuthService);
}
