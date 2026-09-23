import type { AlertState, TeamReach } from "./alerts";
import { formatUsd } from "./money";
import { monthLabel, monthLastDay, monthName, nextMonthStart } from "./month";
import type { CostReport } from "./report";

/** The ops cost view's words, kept here so they're tested with the data. */

export const STATE_LABEL: Record<AlertState, string> = {
  needs_look: "Needs a look",
  flagged: "Flagged",
  resolved: "Resolved",
};

export function teamLabel(reach: TeamReach): string {
  return reach === "texted" ? "Texted" : "Not reached";
}

/** Under the budget bar, on the left. */
export function budgetCaption(report: CostReport): string {
  const tail = "Going over is flagged, never blocked.";
  if (report.totalUsd === 0) {
    const when = report.isCurrent ? " yet" : "";
    return `Nothing spent in ${monthName(report.month)}${when}. ${tail}`;
  }
  const percent = Math.round((report.totalUsd / report.budgetUsd) * 100);
  const share = percent < 1 ? "Under 1%" : `${percent}%`;
  return `${share} of the ${formatUsd(report.budgetUsd, { whole: true })} pilot budget. ${tail}`;
}

/** Under the budget bar, on the right. */
export function periodCaption(report: CostReport): string {
  return report.isCurrent
    ? `A new budget starts ${nextMonthStart(report.month)}`
    : `Month ended ${monthLastDay(report.month)}`;
}

/** The notice above the figures when the team missed an alert. */
export function unreachedNotice(
  unreached: NonNullable<CostReport["unreached"]>,
): string {
  const one = unreached.count === 1;
  const subject = one ? "One alert" : `${unreached.count} alerts`;
  const why =
    unreached.reason === "failed"
      ? ": every text to the team failed"
      : unreached.reason === "no_numbers"
        ? ": no team numbers are set"
        : "";
  const where = one
    ? "It's first in the list below, and this page is the only place it shows."
    : "They're first in the list below, and this page is the only place they show.";
  return `${subject} didn't reach the team${why}. ${where}`;
}

/** The link beside the alerts label to open alerts from earlier months. */
export function earlierOpenLabel(
  earlier: NonNullable<CostReport["earlierOpen"]>,
  viewing: string,
): string {
  const [only] = earlier.months;
  const from =
    earlier.months.length === 1 && only
      ? only.slice(0, 4) === viewing.slice(0, 4)
        ? monthName(only)
        : monthLabel(only)
      : "earlier months";
  const alerts = earlier.count === 1 ? "1 alert" : `${earlier.count} alerts`;
  const verb = earlier.count === 1 ? "needs" : "need";
  return `${alerts} from ${from} still ${verb} a look`;
}

export function emptyAlertsText(report: CostReport): string {
  const month = monthName(report.month);
  return report.isCurrent
    ? `No alerts in ${month} yet. When one is raised, the team gets a text and it's listed here.`
    : `No alerts in ${month}.`;
}

export function emptyCostsText(report: CostReport): string {
  const month = monthName(report.month);
  return report.isCurrent
    ? `No costs in ${month} yet. A text shows up here about a minute after it's sent.`
    : `No costs in ${month}.`;
}

/** Under the by-member table. */
export function memberNote(report: CostReport): string | null {
  const outside = report.outside
    ? "“Not a member” is texts to and from numbers outside the pilot."
    : null;
  if (report.hasClaude) {
    return outside
      ? `${outside} They never reach the agent, so they have no Claude cost.`
      : null;
  }
  return [
    "Every cost so far is a text. Agent runs get their own columns once there are any.",
    outside,
  ]
    .filter(Boolean)
    .join(" ");
}
