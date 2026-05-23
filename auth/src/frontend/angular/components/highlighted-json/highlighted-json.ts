import { CommonModule } from "@angular/common";
import { Component, input } from "@angular/core";

@Component({
  imports: [CommonModule],
  selector: "auth-json",
  standalone: true,
  templateUrl: "./highlighted-json.html",
})
export class HighlightedJsonComponent {
  data = input<unknown>(null);

  get text() {
    return JSON.stringify(this.data(), null, 2) ?? "null";
  }
}
