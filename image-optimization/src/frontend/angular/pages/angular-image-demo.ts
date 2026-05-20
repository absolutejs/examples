import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ImageComponent } from "@absolutejs/absolute/angular/components";

@Component({
  imports: [CommonModule, ImageComponent],
  selector: "angular-page",
  standalone: true,
  templateUrl: "../templates/angular-image-demo.html",
})
export class AngularImageDemoComponent {}

export const factory = () => AngularImageDemoComponent;
