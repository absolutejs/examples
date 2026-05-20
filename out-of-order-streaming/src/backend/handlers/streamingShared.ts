import {
  DAYS_OF_WEEK,
  MILLISECOND_DISPLAY_WIDTH,
  MINUTE_SECOND_DISPLAY_WIDTH,
  POST_NOON_HOUR_THRESHOLD,
  TWELVE_HOUR_CLOCK_DIVISOR,
} from "../../constants";

export const delay = (delayMs: number) => Bun.sleep(delayMs);

export const formatTimestamp = (date: Date) => {
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
