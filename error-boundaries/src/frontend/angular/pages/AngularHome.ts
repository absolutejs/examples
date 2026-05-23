import { Component } from "@angular/core";

export type Context = Record<string, never>;

@Component({
  selector: "angular-page",
  standalone: true,
  templateUrl: "../templates/AngularHome.html",
})
export class AngularHomeComponent {}

export const factory = () => AngularHomeComponent;
