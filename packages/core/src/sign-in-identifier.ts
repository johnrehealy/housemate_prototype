import { toEmail } from "./email";
import { toE164 } from "./phone";

export type SignInIdentifier =
  { kind: "email"; email: string } | { kind: "phone"; phone: string };

/**
 * Reads the sign-in page's one field (D-073). Anything with an "@" is an
 * email; anything else is a US mobile number. Null when it's neither.
 */
export function readSignInIdentifier(input: string): SignInIdentifier | null {
  if (input.includes("@")) {
    const email = toEmail(input);
    return email ? { kind: "email", email } : null;
  }
  const phone = toE164(input);
  return phone ? { kind: "phone", phone } : null;
}
