/** Pilot limits, from docs/decisions.md. */

/** D-029: up to 10 members, invite-only. Also enforced by a database trigger. */
export const PILOT_MEMBER_CAP = 10;

/**
 * D-030, as revised: the whole pilot's monthly spend, not each member's.
 * Going over is flagged to the team; the agent is never stopped.
 */
export const MONTHLY_BUDGET_USD = 100;

/**
 * Budget months run in UTC. The pilot's budget isn't tied to one home, and a
 * boundary a few hours out doesn't matter for a figure that only flags.
 */
export const BUDGET_TIMEZONE = "UTC";
