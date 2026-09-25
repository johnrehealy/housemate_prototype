import { Mark } from "@/components/brand";
import { CLOSE } from "./copy";

/**
 * The closing panel (board P7).
 *
 * The call to action is a link back to the hero's form rather than a second
 * one. Two forms for one waitlist would mean two places to get the states
 * right, and the page would have to decide which of them "joined" belongs to.
 */
export function Close() {
  return (
    <section
      aria-labelledby="close-heading"
      className="hm-close flex flex-col items-center gap-10 bg-evergreen px-6 py-20 lg:px-30 lg:py-28"
    >
      <Mark className="hm-rise h-10 w-auto text-on-evergreen" label={null} />
      {/* Two lines on a phone, where one won't fit at this size, broken
            where the tones change rather than wherever the width runs out. */}
      <h2
        id="close-heading"
        className="hm-rise text-center font-serif text-close-narrow text-on-evergreen lg:text-close"
      >
        <span className="block text-on-evergreen/74 sm:inline">
          {CLOSE.headingStart}
        </span>{" "}
        {CLOSE.headingEnd}
      </h2>
      <a
        href="#waitlist"
        className="hm-rise hm-rise-late flex h-13 w-full max-w-[342px] items-center justify-center rounded-xl bg-canvas px-8 text-base text-evergreen transition-opacity duration-120 ease-out hover:opacity-90 focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen),0_0_0_4px_var(--color-canvas)] sm:w-auto"
      >
        Join the waitlist
      </a>
    </section>
  );
}
