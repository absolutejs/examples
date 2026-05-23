import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ToastService } from "../../services/toast.service";

@Component({
  imports: [CommonModule],
  selector: "auth-toast",
  standalone: true,
  templateUrl: "./toast.html",
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
