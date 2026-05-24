import { Injectable, signal } from "@angular/core";
import { TOAST_DURATION } from "../../../constants";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: ToastTone };

@Injectable({ providedIn: "root" })
export class ToastService {
  readonly items = signal<ToastItem[]>([]);

  remove(id: number) {
    this.items.update((current) => current.filter((item) => item.id !== id));
  }

  add(message: string, tone: ToastTone = "info") {
    const id = Date.now() + Math.random();
    this.items.update((current) => [...current, { id, message, tone }]);
    setTimeout(() => this.remove(id), TOAST_DURATION);
  }
}
