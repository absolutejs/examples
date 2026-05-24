import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";

@Component({
  imports: [CommonModule],
  selector: "spa-home",
  standalone: true,
  templateUrl: "./home.html",
})
export class HomeComponent {}
