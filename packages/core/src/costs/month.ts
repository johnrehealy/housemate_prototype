import { BUDGET_TIMEZONE } from "../config";
import { monthKeyInTimezone } from "../time/timezone";

/**
 * Budget months, as "YYYY-MM". They run in UTC (BUDGET_TIMEZONE), so every
 * boundary here is midnight UTC on the 1st.
 */

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** The month containing `at`. */
export function monthOf(at: Date): string {
  return monthKeyInTimezone(at, BUDGET_TIMEZONE);
}

/** The key if it's a well-formed month, otherwise null. */
export function parseMonth(value: unknown): string | null {
  return typeof value === "string" && MONTH_KEY.test(value) ? value : null;
}

function parts(month: string): [year: number, index: number] {
  const match = MONTH_KEY.exec(month);
  if (!match) throw new Error(`Not a month: ${month}`);
  return [Number(match[1]), Number(match[2]) - 1];
}

/** The month `delta` months after this one (before it when negative). */
export function shiftMonth(month: string, delta: number): string {
  const [year, index] = parts(month);
  const shifted = new Date(Date.UTC(year, index + delta, 1));
  return monthOf(shifted);
}

/** The month's first instant, and the next month's, for `from <= t < to`. */
export function monthRange(month: string): { from: Date; to: Date } {
  const [year, index] = parts(month);
  return {
    from: new Date(Date.UTC(year, index, 1)),
    to: new Date(Date.UTC(year, index + 1, 1)),
  };
}

function format(
  at: Date,
  options: Intl.DateTimeFormatOptions,
  locale = "en-GB",
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: BUDGET_TIMEZONE,
    ...options,
  }).format(at);
}

/** "September". */
export function monthName(month: string): string {
  return format(monthRange(month).from, { month: "long" });
}

/** "September 2026". */
export function monthLabel(month: string): string {
  return format(monthRange(month).from, { month: "long", year: "numeric" });
}

/** "1 October": the day the month after this one starts. */
export function nextMonthStart(month: string): string {
  return format(monthRange(month).to, { day: "numeric", month: "long" });
}

/** "30 September": the month's last day. */
export function monthLastDay(month: string): string {
  const last = new Date(monthRange(month).to.getTime() - 1);
  return format(last, { day: "numeric", month: "long" });
}

/** "22 Sep, 09:12", in UTC like everything else on the page. */
export function formatRaisedAt(at: Date): string {
  const day = format(at, { day: "numeric" });
  // en-GB now abbreviates September as "Sept"; en-US keeps three letters.
  const month = format(at, { month: "short" }, "en-US");
  const time = format(at, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${day} ${month}, ${time}`;
}
