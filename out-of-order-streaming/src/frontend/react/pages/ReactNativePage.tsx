import { Head } from "@absolutejs/absolute/react/components";
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
import { FrameworkSlot } from "../components/FrameworkSlot";
import { Nav } from "../components/Nav";
import type { SlotData } from "../components/ResolvedCard";

type ReactFrameworkPageProps = {
  cssPath?: string;
};

type FrameworkSlotConfig = {
  declaredOrder: string;
  delayMs: number;
  expectedResolveOrder: string;
  id: string;
  label: string;
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

const createSlotPromise = async (
  label: string,
  delayMs: number,
  resolveOrder: string,
): Promise<SlotData> => {
  await delay(delayMs);

  return {
    delayMs,
    label,
    resolvedAt: formatTimestamp(new Date()),
    resolveOrder,
  };
};

const FRAMEWORK_SLOTS: FrameworkSlotConfig[] = [
  {
    declaredOrder: "1st",
    delayMs: FIRST_SLOT_DELAY_MS,
    expectedResolveOrder: "5th",
    id: "react-framework-first",
    label: "React Suspense Slot 1",
  },
  {
    declaredOrder: "2nd",
    delayMs: SECOND_SLOT_DELAY_MS,
    expectedResolveOrder: "2nd",
    id: "react-framework-second",
    label: "React Suspense Slot 2",
  },
  {
    declaredOrder: "3rd",
    delayMs: THIRD_SLOT_DELAY_MS,
    expectedResolveOrder: "6th",
    id: "react-framework-third",
    label: "React Suspense Slot 3",
  },
  {
    declaredOrder: "4th",
    delayMs: FOURTH_SLOT_DELAY_MS,
    expectedResolveOrder: "1st",
    id: "react-framework-fourth",
    label: "React Suspense Slot 4",
  },
  {
    declaredOrder: "5th",
    delayMs: FIFTH_SLOT_DELAY_MS,
    expectedResolveOrder: "4th",
    id: "react-framework-fifth",
    label: "React Suspense Slot 5",
  },
  {
    declaredOrder: "6th",
    delayMs: SIXTH_SLOT_DELAY_MS,
    expectedResolveOrder: "3rd",
    id: "react-framework-sixth",
    label: "React Suspense Slot 6",
  },
];

export const ReactNativePage = ({ cssPath }: ReactFrameworkPageProps) => (
  <html lang="en">
    <Head
      cssPath={cssPath}
      title="AbsoluteJS Streaming - React Framework Primitives"
    />
    <body>
      <Nav activeFramework="react" activeMode="framework" />
      <main>
        <div className="page-title">
          <img alt="React" height={32} src="/assets/svg/react.svg" />
          <h1>React Framework Primitives</h1>
          <span className="badge">Suspense-Shaped</span>
        </div>

        <p className="section-desc">
          This page uses <code>SuspenseSlot</code> with real React fallback and
          resolved markup. The transport is still the same out-of-order slot
          pipeline underneath.
        </p>

        <h2 className="section-title">Framework-Shaped Slots</h2>
        <p className="section-desc">
          Six slots declared in order. Watch them resolve out of sequence
          &mdash; slot 4 arrives first, then 2, 6, 5, 1, and finally 3.
        </p>

        <section className="grid">
          {FRAMEWORK_SLOTS.map((slotConfig) => (
            <FrameworkSlot
              declaredOrder={slotConfig.declaredOrder}
              expectedResolveOrder={slotConfig.expectedResolveOrder}
              id={slotConfig.id}
              key={slotConfig.id}
              label={slotConfig.label}
              promise={createSlotPromise(
                slotConfig.label,
                slotConfig.delayMs,
                slotConfig.expectedResolveOrder,
              )}
              timeoutMs={STREAM_SLOT_TIMEOUT_MS}
            />
          ))}
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
