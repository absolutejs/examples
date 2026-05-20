import { Component } from "@angular/core";

@Component({
  selector: "angular-page",
  standalone: true,
  templateUrl: "../templates/AngularHome.html",
})
export class AngularHomeComponent {}

export const factory = () => AngularHomeComponent;
