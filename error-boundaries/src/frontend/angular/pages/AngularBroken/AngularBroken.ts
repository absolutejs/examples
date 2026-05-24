import { Component } from "@angular/core";

export type Context = Record<string, never>;

@Component({
  selector: "angular-page",
  standalone: true,
  templateUrl: "./AngularBroken.html",
})
export class AngularBrokenComponent {
  constructor() {
    throw new Error("This Angular page intentionally throws during SSR!");
  }
}

export const factory = () => AngularBrokenComponent;
