import type { AuthAdmin } from "../actions/context";
import type { Db } from "../db/client";
import { getMemberByUserId } from "../db/queries";

/**
 * The sign-in account Get started sends its code to (D-073): by the person's
 * number, or by their email when they gave none.
 *
 * An earlier attempt that stopped before the code was confirmed leaves an
 * account with no member behind. Those are deleted first, so each attempt
 * starts clean and an account is never shared between two attempts. An
 * account that belongs to a member is never touched: the caller has already
 * checked that no member has this email or number, so finding one means
 * something else is wrong.
 */
export async function prepareSignupUser(
  deps: { auth: AuthAdmin; db: Pick<Db, "select"> },
  input: { email: string; phone?: string },
): Promise<{ userId: string }> {
  const existing = await deps.auth.findUserIds(input);
  for (const userId of existing) {
    if (await getMemberByUserId(deps.db, userId)) {
      throw new Error(
        "prepareSignupUser: a member's sign-in account holds this email or number.",
      );
    }
    await deps.auth.deleteUser(userId);
  }
  return deps.auth.createSignupUser(
    input.phone ? { phone: input.phone } : { email: input.email },
  );
}
