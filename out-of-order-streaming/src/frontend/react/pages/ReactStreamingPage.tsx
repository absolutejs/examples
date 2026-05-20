import { Head, StreamSlot } from "@absolutejs/absolute/react/components";
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
  STREAM_SLOT_TIMEOUT_MS,
  THIRD_SLOT_DELAY_MS,
  TWELVE_HOUR_CLOCK_DIVISOR,
} from "../../../constants";
import { Nav } from "../components/Nav";

type ReactStreamingPageProps = {
  cssPath?: string;
};

const delay = (delayMs: number) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

const formatTimestamp = (date: Date) => {
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
};

const renderSlot = async (
  label: string,
  delayMs: number,
  declaredOrder: string,
  resolveOrder: string,
  primitive: string,
) => {
  await delay(delayMs);

  return `<article class="stream-card stream-card-react"><div class="stream-header"><img alt="React" height="20" src="/assets/svg/react.svg" /><span>${label}</span></div><div class="stream-meta"><span>Declared ${declaredOrder}</span><span>Resolved ${resolveOrder}</span><span>${delayMs}ms</span><span>${primitive}</span></div><p class="stream-desc">Arrived independently and replaced its matching placeholder.</p><p class="stream-timestamp"><strong>Resolved at</strong> ${formatTimestamp(new Date())}</p></article>`;
};

const createFallback = (
  declaredOrder: string,
  expectedResolveOrder: string,
  label: string,
  primitive: string,
) =>
  `<article class="stream-card stream-card-react stream-card-fallback"><div class="stream-header"><img alt="React" height="20" src="/assets/svg/react.svg" /><span>${label}</span></div><div class="stream-meta"><span>Declared ${declaredOrder}</span><span>Expected ${expectedResolveOrder}</span><span>Fallback</span><span>${primitive}</span></div><p class="stream-desc">Waiting for server to stream resolved markup into this slot.</p><div class="stream-timestamp-skeleton"></div></article>`;

export const ReactStreamingPage = ({ cssPath }: ReactStreamingPageProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="AbsoluteJS Streaming - React Raw Slots" />
    <body>
      <Nav activeFramework="react" activeMode="raw" />
      <main>
        <div className="page-title">
          <img alt="React" height={32} src="/assets/svg/react.svg" />
          <h1>React Raw Slots</h1>
          <span className="badge">Transport Primitive</span>
        </div>

        <p className="section-desc">
          This page shows the low-level <code>StreamSlot</code> transport
          directly. The cards stay in declaration order while their server HTML
          lands in resolve order.
        </p>

        <h2 className="section-title">Streamed Slots</h2>
        <p className="section-desc">
          Six slots declared in order. Watch them resolve out of sequence
          &mdash; slot 4 arrives first, then 2, 6, 5, 1, and finally 3.
        </p>

        <section className="grid">
          <StreamSlot
            fallbackHtml={createFallback(
              "1st",
              "5th",
              "React Slot 1",
              "StreamSlot",
            )}
            id="react-first"
            resolve={() =>
              renderSlot(
                "React Slot 1",
                FIRST_SLOT_DELAY_MS,
                "1st",
                "5th",
                "StreamSlot",
              )
            }
            timeoutMs={STREAM_SLOT_TIMEOUT_MS}
          />
          <StreamSlot
            fallbackHtml={createFallback(
              "2nd",
              "2nd",
              "React Slot 2",
              "StreamSlot",
            )}
            id="react-second"
            resolve={() =>
              renderSlot(
                "React Slot 2",
                SECOND_SLOT_DELAY_MS,
                "2nd",
                "2nd",
                "StreamSlot",
              )
            }
            timeoutMs={STREAM_SLOT_TIMEOUT_MS}
          />
          <StreamSlot
            fallbackHtml={createFallback(
              "3rd",
              "6th",
              "React Slot 3",
              "StreamSlot",
            )}
            id="react-third"
            resolve={() =>
              renderSlot(
                "React Slot 3",
                THIRD_SLOT_DELAY_MS,
                "3rd",
                "6th",
                "StreamSlot",
              )
            }
            timeoutMs={STREAM_SLOT_TIMEOUT_MS}
          />
          <StreamSlot
            fallbackHtml={createFallback(
              "4th",
              "1st",
              "React Slot 4",
              "StreamSlot",
            )}
            id="react-fourth"
            resolve={() =>
              renderSlot(
                "React Slot 4",
                FOURTH_SLOT_DELAY_MS,
                "4th",
                "1st",
                "StreamSlot",
              )
            }
            timeoutMs={STREAM_SLOT_TIMEOUT_MS}
          />
          <StreamSlot
            fallbackHtml={createFallback(
              "5th",
              "4th",
              "React Slot 5",
              "StreamSlot",
            )}
            id="react-fifth"
            resolve={() =>
              renderSlot(
                "React Slot 5",
                FIFTH_SLOT_DELAY_MS,
                "5th",
                "4th",
                "StreamSlot",
              )
            }
            timeoutMs={STREAM_SLOT_TIMEOUT_MS}
          />
          <StreamSlot
            fallbackHtml={createFallback(
              "6th",
              "3rd",
              "React Slot 6",
              "StreamSlot",
            )}
            id="react-sixth"
            resolve={() =>
              renderSlot(
                "React Slot 6",
                SIXTH_SLOT_DELAY_MS,
                "6th",
                "3rd",
                "StreamSlot",
              )
            }
            timeoutMs={STREAM_SLOT_TIMEOUT_MS}
          />
        </section>

        <p className="footer">
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
    </body>
  </html>
);
