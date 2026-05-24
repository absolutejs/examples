import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";

@Component({
  imports: [CommonModule],
  selector: "spa-profile",
  standalone: true,
  templateUrl: "./profile.html",
})
export class ProfileComponent {}
