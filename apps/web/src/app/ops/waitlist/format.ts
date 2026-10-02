/**
 * "3 Sept": a day and a short month, in UTC like the rest of ops. British
 * English, whose September is "Sept", as board O5 writes it.
 */
export function shortDate(value: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((each) => each.type === type)?.value ?? "";
  return `${part("day")} ${part("month")}`;
}
