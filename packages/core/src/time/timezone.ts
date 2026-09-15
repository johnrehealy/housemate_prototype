/** Quiet hours for unprompted texts: 10 PM to 8 AM in the home's timezone. */
export const QUIET_HOURS_START_HOUR = 22;
export const QUIET_HOURS_END_HOUR = 8;

/** Hour of day (0-23) at `at`, in the given IANA timezone. */
export function hourInTimezone(at: Date, timeZone: string): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).format(at);
  // Some runtimes render midnight as "24".
  return Number(formatted) % 24;
}

/** True when the agent must not send an unprompted text. */
export function isWithinQuietHours(at: Date, timeZone: string): boolean {
  const hour = hourInTimezone(at, timeZone);
  return hour >= QUIET_HOURS_START_HOUR || hour < QUIET_HOURS_END_HOUR;
}

/** Calendar month as "YYYY-MM" in the given timezone, used for budget periods. */
export function monthKeyInTimezone(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(at);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error(`Unsupported timezone: ${timeZone}`);
  return `${year}-${month}`;
}

/** Start of the calendar month containing `at`, in the given timezone. */
export function startOfMonthInTimezone(at: Date, timeZone: string): Date {
  const [year, month] = monthKeyInTimezone(at, timeZone).split("-").map(Number);
  if (!year || !month) throw new Error(`Unsupported timezone: ${timeZone}`);

  // Find the UTC instant whose local date is the 1st at 00:00 by correcting
  // a UTC guess with that zone's offset at the guessed time.
  const guess = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const offset = timezoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess - offset);
}

/** How far ahead of UTC the timezone is, in milliseconds, at `at`. */
function timezoneOffsetMs(at: Date, timeZone: string): number {
  const asUtc = new Date(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "UTC",
      dateStyle: "short",
      timeStyle: "medium",
    }).format(at) + "Z",
  );
  const asLocal = new Date(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      dateStyle: "short",
      timeStyle: "medium",
    }).format(at) + "Z",
  );
  return asLocal.getTime() - asUtc.getTime();
}
