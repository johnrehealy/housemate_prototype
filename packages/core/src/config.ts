/** Pilot limits, from docs/decisions.md. */

/** D-029: up to 10 members, invite-only. Also enforced by a database trigger. */
export const PILOT_MEMBER_CAP = 10;

/** D-030: flag a member above this monthly spend; don't stop the agent. */
export const MONTHLY_BUDGET_USD = 100;
