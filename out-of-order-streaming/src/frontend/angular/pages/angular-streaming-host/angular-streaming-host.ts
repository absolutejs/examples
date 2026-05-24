import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { StreamSlotComponent } from "@absolutejs/absolute/angular/components";
import {
  DAYS_OF_WEEK,
  FIFTH_SLOT_DELAY_MS,
  FIRST_SLOT_DELAY_MS,
  FOURTH_SLOT_DELAY_MS,
  MILLISECOND_DISPLAY_WIDTH,
  MINUTE_SECOND_DISPLAY_WIDTH,
  POST_NOON_HOUR_THRESHOLD,
  SECOND_SLOT_DELAY_MS,
  SIXTH_SLOT_DELAY_MS,
  THIRD_SLOT_DELAY_MS,
  TWELVE_HOUR_CLOCK_DIVISOR,
} from "../../../../constants";

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

@Component({
  imports: [CommonModule, StreamSlotComponent],
  selector: "angular-streaming-host-page",
  standalone: true,
  templateUrl: "./angular-streaming-host.html",
})
export class AngularStreamingHostComponent {
  private formatTimestamp(date: Date) {
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

  createFallback(
    declaredOrder: string,
    expectedResolveOrder: string,
    label: string,
    primitive: string,
  ) {
    return `<article class="stream-card stream-card-angular stream-card-fallback"><div class="stream-header"><img alt="Angular" height="20" src="/assets/svg/angular.svg" /><span>${label}</span></div><div class="stream-meta"><span>Declared ${declaredOrder}</span><span>Expected ${expectedResolveOrder}</span><span>Fallback</span><span>${primitive}</span></div><p class="stream-desc">Waiting for server to stream resolved markup into this slot.</p><div class="stream-timestamp-skeleton"></div></article>`;
  }

  createResolved(
    label: string,
    delayMs: number,
    declaredOrder: string,
    resolveOrder: string,
    primitive: string,
  ) {
    return `<article class="stream-card stream-card-angular"><div class="stream-header"><img alt="Angular" height="20" src="/assets/svg/angular.svg" /><span>${label}</span></div><div class="stream-meta"><span>Declared ${declaredOrder}</span><span>Resolved ${resolveOrder}</span><span>${delayMs}ms</span><span>${primitive}</span></div><p class="stream-desc">Arrived independently and replaced its matching placeholder.</p><p class="stream-timestamp"><strong>Resolved at</strong> ${this.formatTimestamp(new Date())}</p></article>`;
  }

  readonly resolveFirstSlot = async () => {
    await Bun.sleep(FIRST_SLOT_DELAY_MS);

    return this.createResolved(
      "Angular Slot 1",
      FIRST_SLOT_DELAY_MS,
      "1st",
      "5th",
      "StreamSlotComponent",
    );
  };

  readonly resolveSecondSlot = async () => {
    await Bun.sleep(SECOND_SLOT_DELAY_MS);

    return this.createResolved(
      "Angular Slot 2",
      SECOND_SLOT_DELAY_MS,
      "2nd",
      "2nd",
      "StreamSlotComponent",
    );
  };

  readonly resolveThirdSlot = async () => {
    await Bun.sleep(THIRD_SLOT_DELAY_MS);

    return this.createResolved(
      "Angular Slot 3",
      THIRD_SLOT_DELAY_MS,
      "3rd",
      "6th",
      "StreamSlotComponent",
    );
  };

  readonly resolveFourthSlot = async () => {
    await Bun.sleep(FOURTH_SLOT_DELAY_MS);

    return this.createResolved(
      "Angular Slot 4",
      FOURTH_SLOT_DELAY_MS,
      "4th",
      "1st",
      "StreamSlotComponent",
    );
  };

  readonly resolveFifthSlot = async () => {
    await Bun.sleep(FIFTH_SLOT_DELAY_MS);

    return this.createResolved(
      "Angular Slot 5",
      FIFTH_SLOT_DELAY_MS,
      "5th",
      "4th",
      "StreamSlotComponent",
    );
  };

  readonly resolveSixthSlot = async () => {
    await Bun.sleep(SIXTH_SLOT_DELAY_MS);

    return this.createResolved(
      "Angular Slot 6",
      SIXTH_SLOT_DELAY_MS,
      "6th",
      "3rd",
      "StreamSlotComponent",
    );
  };
}

export default AngularStreamingHostComponent;
export const factory = () => new AngularStreamingHostComponent();
