import { Mark } from "@/components/brand";
import { CLOSE } from "./copy";

/**
 * The closing panel and the footer (board P7).
 *
 * The call to action is a link back to the hero's form rather than a second
 * one. Two forms for one waitlist would mean two places to get the states
 * right, and the page would have to decide which of them "joined" belongs to.
 */
export function Close() {
  return (
    <>
      <section
        aria-labelledby="close-heading"
        className="flex flex-col items-center gap-10 bg-evergreen px-6 py-20 lg:px-30 lg:py-28"
      >
        <Mark className="hm-rise h-10 w-auto text-on-evergreen" label={null} />
        <h2
          id="close-heading"
          className="hm-rise text-center font-serif text-close-narrow text-on-evergreen lg:text-close"
        >
          <span className="block text-on-evergreen/74">{CLOSE.firstLine}</span>
          {CLOSE.secondLine}
        </h2>
        <p className="hm-rise max-w-[560px] text-center text-base text-pretty text-on-evergreen/72 lg:text-lead">
          {CLOSE.lead}
        </p>
        <a
          href="#waitlist"
          className="hm-rise hm-rise-late flex h-13 w-full max-w-[342px] items-center justify-center rounded-xl bg-canvas px-8 text-base text-evergreen transition-opacity duration-120 ease-out hover:opacity-90 focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen),0_0_0_4px_var(--color-canvas)] sm:w-auto"
        >
          Join the waitlist
        </a>
      </section>
      {/*
       * No privacy, terms or contact link. The board draws all three, none of
       * the pages exists, and D-061 says there is no link until one does. They
       * go in with HOU-50, not before.
       */}
      <footer className="flex h-18 items-center justify-center border-t border-on-evergreen/12 bg-evergreen px-6 lg:px-30">
        <p className="text-xs text-on-evergreen/59">{CLOSE.copyright}</p>
      </footer>
    </>
  );
}
