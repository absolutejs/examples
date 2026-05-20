import { Component } from "@angular/core";

@Component({
  selector: "angular-page",
  standalone: true,
  template: "<p>This should never render.</p>",
})
export class AngularBrokenComponent {
  constructor() {
    throw new Error("This Angular page intentionally throws during SSR!");
  }
}

export const factory = () => AngularBrokenComponent;
