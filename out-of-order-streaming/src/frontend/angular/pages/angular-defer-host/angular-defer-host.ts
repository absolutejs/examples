import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import {
  DAYS_OF_WEEK,
  MILLISECOND_DISPLAY_WIDTH,
  MINUTE_SECOND_DISPLAY_WIDTH,
  POST_NOON_HOUR_THRESHOLD,
  TWELVE_HOUR_CLOCK_DIVISOR,
} from "../../../../constants";

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

@Component({
  imports: [CommonModule],
  selector: "angular-defer-host-page",
  standalone: true,
  templateUrl: "./angular-defer-host.html",
})
export class AngularDeferHostComponent {
  timestamp() {
    const date = new Date();
    const dayName = DAYS_OF_WEEK[date.getDay()];
    const hour24 = date.getHours();
    const minuteText = String(date.getMinutes()).padStart(
      MINUTE_SECOND_DISPLAY_WIDTH,
      "0",
    );
    const secondText = String(date.getSeconds()).padStart(
      MINUTE_SECOND_DISPLAY_WIDTH,
      "0",
    );
    const millisecondText = String(date.getMilliseconds()).padStart(
      MILLISECOND_DISPLAY_WIDTH,
      "0",
    );
    const meridiem = hour24 >= POST_NOON_HOUR_THRESHOLD ? "PM" : "AM";
    const hour12 =
      hour24 % TWELVE_HOUR_CLOCK_DIVISOR || TWELVE_HOUR_CLOCK_DIVISOR;

    return `${dayName} ${hour12}:${minuteText}:${secondText}.${millisecondText} ${meridiem}`;
  }
}

export default AngularDeferHostComponent;
export const factory = () => new AngularDeferHostComponent();
