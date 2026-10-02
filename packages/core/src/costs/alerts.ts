import { MONTHLY_BUDGET_USD } from "../config";
import { QUEUES } from "../queue/jobs";
import { formatUsd } from "./money";
import { monthName } from "./month";

/**
 * How the ops view reads an alert. An alert row only says what was raised and
 * whether the team was texted; whether it still needs anyone is worked out
 * from what happened since, so the view can't go stale while nobody is
 * clearing alerts by hand.
 */

export type AlertKind =
  "member_over_budget" | "pilot_over_budget" | "worker_error" | "send_stuck";

type DeliveryStatus =
  "received" | "queued" | "sent" | "delivered" | "undelivered" | "failed";

/** Everything the view needs to know about one alert. */
export type AlertFacts = {
  id: string;
  kind: AlertKind;
  detail: Record<string, unknown>;
  notifiedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  /** How many texts to the team were saved for it; 0 when no numbers are set. */
  teamTexts: number;
  /** The text the alert is about, when it names one and it still exists. */
  message: {
    id: string;
    direction: "inbound" | "outbound";
    outboundKind: "reply" | "proactive" | null;
    deliveryStatus: DeliveryStatus;
    /** The member's first name; null for texts with numbers outside the pilot. */
    memberName: string | null;
    /** True for the team's own alert texts. */
    toTeam: boolean;
  } | null;
  /** For a failed job: whether it's still parked in its dead-letter queue. */
  parked: boolean | null;
};

/**
 * - `needs_look`: nothing has fixed it yet.
 * - `flagged`: there's nothing to fix; the team just needs to know (going over
 *   budget is flagged, never blocked).
 * - `resolved`: whatever it was about has since sorted itself out, or someone
 *   marked it resolved.
 */
export type AlertState = "needs_look" | "flagged" | "resolved";

/**
 * Whether the team heard about it. `no_numbers` means no team numbers were set,
 * `failed` that every text to them failed.
 */
export type TeamReach = "texted" | "no_numbers" | "failed";

export type AlertIcon = "receipt" | "chat" | "wallet" | "warning";

/** One row of the alerts table. Stuck sends found in one sweep share a row. */
export type AlertRow = {
  key: string;
  icon: AlertIcon;
  title: string;
  detail: string;
  state: AlertState;
  team: TeamReach;
  raisedAt: Date;
  /** How many alerts the row stands for. */
  count: number;
};

/** Stuck sends raised this close together came from the same sweep. */
const SAME_SWEEP_MS = 60_000;

const SHORT_ID_LENGTH = 6;

function shortId(id: string): string {
  return id.slice(0, SHORT_ID_LENGTH);
}

function detailString(facts: AlertFacts, key: string): string | null {
  const value = facts.detail[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

function detailNumber(facts: AlertFacts, key: string): number | null {
  const value = Number(facts.detail[key]);
  return Number.isFinite(value) ? value : null;
}

/** Whether a text is still missing a good delivery result. */
function stillUndelivered(status: DeliveryStatus): boolean {
  return status !== "sent" && status !== "delivered";
}

export function alertState(facts: AlertFacts): AlertState {
  if (facts.resolvedAt) return "resolved";
  switch (facts.kind) {
    case "pilot_over_budget":
    case "member_over_budget":
      return "flagged";
    case "send_stuck":
      // A text that's gone can't be looked into; say so rather than hide it.
      if (!facts.message) return "needs_look";
      return stillUndelivered(facts.message.deliveryStatus)
        ? "needs_look"
        : "resolved";
    case "worker_error":
      return facts.parked === false ? "resolved" : "needs_look";
  }
}

export function teamReach(facts: AlertFacts): TeamReach {
  if (facts.notifiedAt) return "texted";
  return facts.teamTexts === 0 ? "no_numbers" : "failed";
}

/** Who a text was to or from, as the alert names them. */
function party(message: NonNullable<AlertFacts["message"]>): string {
  if (message.toTeam) return "the team";
  return message.memberName ?? "someone outside the pilot";
}

function stuckSendTitle(facts: AlertFacts): string {
  const minutes = detailNumber(facts, "ageMinutes") ?? 15;
  const { message } = facts;
  if (!message) return `A text had no delivery result for ${minutes} minutes.`;
  const what = message.outboundKind === "reply" ? "A reply" : "A text";
  return `${what} to ${party(message)} had no delivery result for ${minutes} minutes.`;
}

function stuckSendDetail(facts: AlertFacts): string {
  const id = detailString(facts, "messageId");
  const label = id ? `Message ${shortId(id)}` : "Message unknown";
  const { message } = facts;
  if (!message) return `${label} · no longer on record`;
  switch (message.deliveryStatus) {
    case "delivered":
      return `${label} · delivered since`;
    case "sent":
      return `${label} · sent since`;
    case "undelivered":
    case "failed":
      return `${label} · failed to send`;
    default:
      return `${label} · still waiting`;
  }
}

function workerErrorCopy(
  facts: AlertFacts,
  month: string,
): { icon: AlertIcon; title: string } {
  const queue = detailString(facts, "queue");
  if (queue === QUEUES.messageCosts) {
    return {
      icon: "receipt",
      title: `One text's price couldn't be fetched, so ${monthName(month)}'s total is about 1¢ short.`,
    };
  }
  if (queue === QUEUES.inboundMessages) {
    // Once the parked job is cleared, who sent the text is no longer known.
    const from = facts.message ? ` from ${party(facts.message)}` : "";
    return {
      icon: "chat",
      title: `A text${from} failed every retry and hasn't been handled.`,
    };
  }
  return {
    icon: "warning",
    title: `A job on ${queue ?? "a queue"} failed every retry.`,
  };
}

function workerErrorDetail(facts: AlertFacts): string {
  const attempts = detailNumber(facts, "attempts");
  const tries =
    attempts === null
      ? "failed every retry"
      : `gave up after ${attempts} ${attempts === 1 ? "try" : "tries"}`;
  if (facts.message) return `Message ${shortId(facts.message.id)} · ${tries}`;
  // The parked job carried the message ID; once it's cleared, only the job's
  // own number is left.
  const job = detailString(facts, "msgId");
  const cleared = facts.parked === false ? ", since cleared" : "";
  return `Job ${job ?? "unknown"} · ${tries}${cleared}`;
}

/** The row's icon and words, before any grouping. */
export function describeAlert(
  facts: AlertFacts,
  month: string,
): { icon: AlertIcon; title: string; detail: string } {
  switch (facts.kind) {
    case "pilot_over_budget": {
      const total = detailNumber(facts, "totalUsd");
      const budget = detailNumber(facts, "budgetUsd") ?? MONTHLY_BUDGET_USD;
      return {
        icon: "wallet",
        title: `Went over the ${formatUsd(budget, { whole: true })} budget. Nothing was blocked.`,
        detail:
          total === null
            ? "Spending at the time wasn't recorded"
            : `${formatUsd(total)} spent at the time`,
      };
    }
    case "member_over_budget":
      return {
        icon: "wallet",
        title: "A member went over their budget. Nothing was blocked.",
        detail: "Budgets are per pilot for now, so this is unexpected",
      };
    case "send_stuck":
      return {
        icon: "chat",
        title: stuckSendTitle(facts),
        detail: stuckSendDetail(facts),
      };
    case "worker_error":
      return {
        ...workerErrorCopy(facts, month),
        detail: workerErrorDetail(facts),
      };
  }
}

/** What a row is worth reading for: the team not hearing about it comes first. */
function rank(row: AlertRow): number {
  const unreached = row.team === "texted" ? 1 : 0;
  const state = { needs_look: 0, flagged: 1, resolved: 2 }[row.state];
  return unreached * 10 + state;
}

function worstState(states: AlertState[]): AlertState {
  if (states.includes("needs_look")) return "needs_look";
  if (states.includes("flagged")) return "flagged";
  return "resolved";
}

function worstReach(reaches: TeamReach[]): TeamReach {
  if (reaches.includes("failed")) return "failed";
  if (reaches.includes("no_numbers")) return "no_numbers";
  return "texted";
}

/** One row for several stuck sends found in the same sweep. */
function stuckSweepRow(sweep: AlertFacts[]): AlertRow {
  const states = sweep.map(alertState);
  const open = states.filter((state) => state === "needs_look").length;
  const minutes = Math.min(
    ...sweep.map((facts) => detailNumber(facts, "ageMinutes") ?? 15),
  );
  const ids = sweep
    .map((facts) => detailString(facts, "messageId"))
    .filter((id): id is string => id !== null)
    .map(shortId);
  const outcome =
    open === 0
      ? "all delivered since"
      : open === sweep.length
        ? "none delivered yet"
        : `${open} still need a look`;
  const first = sweep[0];
  if (!first) throw new Error("A sweep has at least one alert");
  return {
    key: first.id,
    icon: "chat",
    title: `${sweep.length} texts had no delivery result for ${minutes} minutes.`,
    detail: `Messages ${ids.join(", ")} · ${outcome}`,
    state: worstState(states),
    team: worstReach(sweep.map(teamReach)),
    raisedAt: first.createdAt,
    count: sweep.length,
  };
}

/**
 * The alerts table for a month: each alert's state worked out, stuck sends
 * from one sweep folded into one row, and the rows in reading order — any the
 * team never heard about first, then what needs a look, then what's flagged,
 * then what's resolved, newest first within each.
 */
export function buildAlertRows(facts: AlertFacts[], month: string): AlertRow[] {
  const rows: AlertRow[] = [];

  const stuck = facts
    .filter((alert) => alert.kind === "send_stuck")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let sweep: AlertFacts[] = [];
  const flush = () => {
    const [only] = sweep;
    if (sweep.length > 1) rows.push(stuckSweepRow(sweep));
    else if (only) rows.push(singleRow(only, month));
    sweep = [];
  };
  for (const alert of stuck) {
    const last = sweep.at(-1);
    if (
      last &&
      alert.createdAt.getTime() - last.createdAt.getTime() > SAME_SWEEP_MS
    ) {
      flush();
    }
    sweep.push(alert);
  }
  flush();

  for (const alert of facts) {
    if (alert.kind !== "send_stuck") rows.push(singleRow(alert, month));
  }

  return rows.sort(
    (a, b) => rank(a) - rank(b) || b.raisedAt.getTime() - a.raisedAt.getTime(),
  );
}

function singleRow(facts: AlertFacts, month: string): AlertRow {
  return {
    key: facts.id,
    ...describeAlert(facts, month),
    state: alertState(facts),
    team: teamReach(facts),
    raisedAt: facts.createdAt,
    count: 1,
  };
}
