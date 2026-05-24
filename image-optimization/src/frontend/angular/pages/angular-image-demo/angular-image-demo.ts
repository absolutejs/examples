import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ImageComponent } from "@absolutejs/absolute/angular/components";

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

@Component({
  imports: [CommonModule, ImageComponent],
  selector: "angular-page",
  standalone: true,
  templateUrl: "./angular-image-demo.html",
})
class AngularImageDemoComponent {}

export default AngularImageDemoComponent;
