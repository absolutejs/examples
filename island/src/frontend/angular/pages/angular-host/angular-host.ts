import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { Island } from "@absolutejs/absolute/angular";

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

@Component({
  imports: [CommonModule, Island],
  selector: "angular-host-page",
  standalone: true,
  templateUrl: "./angular-host.html",
})
export class AngularHostComponent {}

export default AngularHostComponent;
export const factory = () => new AngularHostComponent();
