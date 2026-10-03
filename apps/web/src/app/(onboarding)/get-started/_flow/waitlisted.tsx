import Link from "next/link";
import { INLINE_LINK } from "@/components/onboarding/controls";
import { HELPER, QUESTION } from "../../_components/onboarding-header";

/**
 * W1: someone gave their details but isn't on the alpha list, or the pilot is
 * full (docs/design.md §4 Get started, D-072). Their details are saved, and
 * the let-in email will bring them back. From the website, where they typed
 * the email, "Change it" goes back to G3 to fix it.
 */
export function Waitlisted({
  firstName,
  email,
  onChangeEmail,
}: {
  firstName: string;
  email: string;
  /** Only where the email could be typed: on a link it's the invite's. */
  onChangeEmail?: () => void;
}) {
  return (
    <section className="flex w-full flex-col items-center text-center">
      {/* Focusable, so the flow can move focus here when it shows. */}
      <h1 tabIndex={-1} className={`${QUESTION} mt-7 outline-none md:mt-10`}>
        You&rsquo;re on the waitlist.
      </h1>
      <p className={`${HELPER} mt-3 max-w-[560px] text-pretty md:mt-4`}>
        Thanks, {firstName}. We&rsquo;ll email {email} as soon as a spot opens
        up.
      </p>
      {onChangeEmail ? (
        <p className="mt-3 text-label text-muted">
          Wrong email?{" "}
          <button type="button" onClick={onChangeEmail} className={INLINE_LINK}>
            Change it
          </button>
        </p>
      ) : null}
      <Link href="/" className={`${INLINE_LINK} mt-8 text-label`}>
        Back to the home page
      </Link>
    </section>
  );
}
