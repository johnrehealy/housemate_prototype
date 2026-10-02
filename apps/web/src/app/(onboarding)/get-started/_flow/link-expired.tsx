import Link from "next/link";
import { LARGE_BUTTON } from "@/components/onboarding/controls";
import { HELPER, QUESTION } from "../../_components/onboarding-header";

/**
 * G6: one page for a link that never existed, was used, or expired, so it
 * never says which (D-068, D-072). The question sits 160px below the header: the
 * board's 120px, plus the 40px every step's question group carries.
 */
export function LinkExpired() {
  return (
    <section className="mx-auto flex w-full max-w-[720px] flex-col items-center px-5 pt-6 pb-10 text-center md:pt-40">
      {/* Focusable, so the flow can move focus here when a link dies. */}
      <h1 tabIndex={-1} className={`${QUESTION} outline-none`}>
        This link has expired.
      </h1>
      <p className={`${HELPER} mt-3 max-w-[540px] md:mt-4`}>
        Get started links work once and last 14 days. If you&rsquo;ve already
        set up your account, sign in. If not, email{" "}
        <a
          href="mailto:john@myhousemate.co"
          className="text-evergreen underline decoration-1 underline-offset-3"
        >
          john@myhousemate.co
        </a>{" "}
        and we&rsquo;ll send you a new one.
      </p>
      <Link href="/sign-in" className={`${LARGE_BUTTON} mt-10`}>
        Sign in
      </Link>
    </section>
  );
}
