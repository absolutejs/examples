import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import {
  DAYS_OF_WEEK,
  MILLISECOND_DISPLAY_WIDTH,
  MINUTE_SECOND_DISPLAY_WIDTH,
  POST_NOON_HOUR_THRESHOLD,
  TWELVE_HOUR_CLOCK_DIVISOR,
} from "../../../constants";

@Component({
  imports: [CommonModule],
  selector: "angular-defer-host-page",
  standalone: true,
  template: `
    <header>
      <a href="/" class="logo">
        <img
          src="/assets/png/absolutejs-temp.png"
          height="24"
          alt="AbsoluteJS"
        />
        AbsoluteJS
      </a>
      <div class="nav-stack">
        <nav class="nav-row">
          <span class="nav-label">Raw Slots</span>
          <a href="/">React</a>
          <a href="/svelte">Svelte</a>
          <a href="/vue">Vue</a>
          <a href="/angular">Angular</a>
          <a href="/html">HTML</a>
          <a href="/htmx">HTMX</a>
        </nav>
        <nav class="nav-row nav-row-secondary">
          <span class="nav-label">Framework Primitives</span>
          <a href="/react-framework">React</a>
          <a href="/svelte-framework">Svelte</a>
          <a href="/vue-framework">Vue</a>
          <a href="/angular-framework" class="active">Angular</a>
        </nav>
      </div>
    </header>

    <main>
      <div class="page-title">
        <img alt="Angular" height="32" src="/assets/svg/angular.svg" />
        <h1>Angular Framework Primitives</h1>
        <span class="badge">Defer-Shaped</span>
      </div>

      <p class="section-desc">
        This page uses real <code>&#64;defer</code> blocks. AbsoluteJS lowers
        them into the out-of-order slot transport, so the authoring model stays
        Angular-native.
      </p>

      <h2 class="section-title">Framework-Shaped Slots</h2>
      <p class="section-desc">
        Six slots declared in order. Watch them resolve out of sequence &mdash;
        slot 4 arrives first, then 2, 6, 5, 1, and finally 3.
      </p>

      <section class="grid">
        @defer (on timer(3000ms)) {
          <article class="stream-card stream-card-angular">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 1</span>
            </div>
            <div class="stream-meta">
              <span>Declared 1st</span>
              <span>Resolved 5th</span>
              <span>3000ms</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Authored as Angular markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ timestamp() }}
            </p>
          </article>
        } @placeholder {
          <article class="stream-card stream-card-angular stream-card-fallback">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 1</span>
            </div>
            <div class="stream-meta">
              <span>Declared 1st</span>
              <span>Expected 5th</span>
              <span>Fallback</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        }

        @defer (on timer(1000ms)) {
          <article class="stream-card stream-card-angular">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 2</span>
            </div>
            <div class="stream-meta">
              <span>Declared 2nd</span>
              <span>Resolved 2nd</span>
              <span>1000ms</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Authored as Angular markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ timestamp() }}
            </p>
          </article>
        } @placeholder {
          <article class="stream-card stream-card-angular stream-card-fallback">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 2</span>
            </div>
            <div class="stream-meta">
              <span>Declared 2nd</span>
              <span>Expected 2nd</span>
              <span>Fallback</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        }

        @defer (on timer(3500ms)) {
          <article class="stream-card stream-card-angular">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 3</span>
            </div>
            <div class="stream-meta">
              <span>Declared 3rd</span>
              <span>Resolved 6th</span>
              <span>3500ms</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Authored as Angular markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ timestamp() }}
            </p>
          </article>
        } @placeholder {
          <article class="stream-card stream-card-angular stream-card-fallback">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 3</span>
            </div>
            <div class="stream-meta">
              <span>Declared 3rd</span>
              <span>Expected 6th</span>
              <span>Fallback</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        }

        @defer (on timer(500ms)) {
          <article class="stream-card stream-card-angular">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 4</span>
            </div>
            <div class="stream-meta">
              <span>Declared 4th</span>
              <span>Resolved 1st</span>
              <span>500ms</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Authored as Angular markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ timestamp() }}
            </p>
          </article>
        } @placeholder {
          <article class="stream-card stream-card-angular stream-card-fallback">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 4</span>
            </div>
            <div class="stream-meta">
              <span>Declared 4th</span>
              <span>Expected 1st</span>
              <span>Fallback</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        }

        @defer (on timer(2200ms)) {
          <article class="stream-card stream-card-angular">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 5</span>
            </div>
            <div class="stream-meta">
              <span>Declared 5th</span>
              <span>Resolved 4th</span>
              <span>2200ms</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Authored as Angular markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ timestamp() }}
            </p>
          </article>
        } @placeholder {
          <article class="stream-card stream-card-angular stream-card-fallback">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 5</span>
            </div>
            <div class="stream-meta">
              <span>Declared 5th</span>
              <span>Expected 4th</span>
              <span>Fallback</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        }

        @defer (on timer(1500ms)) {
          <article class="stream-card stream-card-angular">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 6</span>
            </div>
            <div class="stream-meta">
              <span>Declared 6th</span>
              <span>Resolved 3rd</span>
              <span>1500ms</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Authored as Angular markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ timestamp() }}
            </p>
          </article>
        } @placeholder {
          <article class="stream-card stream-card-angular stream-card-fallback">
            <div class="stream-header">
              <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
              <span>Angular Defer Slot 6</span>
            </div>
            <div class="stream-meta">
              <span>Declared 6th</span>
              <span>Expected 3rd</span>
              <span>Fallback</span>
              <span>&#64;defer</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        }
      </section>

      <p class="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          AbsoluteJS
        </a>
      </p>
    </main>
  `,
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
