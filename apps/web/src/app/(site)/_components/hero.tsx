import { ArrowDown } from "@phosphor-icons/react/dist/ssr";
import { Mark } from "@/components/brand";
import { WaitlistForm } from "../waitlist-form";
import { HERO } from "./copy";

/**
 * The hero (boards H3 → H1 → H2, rotation spec H4; round 4's "H3 ·
 * Evergreen" for the mark, the spacing and "Learn more").
 *
 * On wide screens the content is centred on the whole first screen, bar
 * included, as the board draws it, rather than on the space under the bar:
 * the extra bottom padding is the bar's height.
 *
 * The rotating line is CSS only. Each phrase is its own span on the same
 * stacking slot, and `--phrase-count` staggers them, so nothing here runs
 * JavaScript, re-renders, or differs between the server and the first paint.
 *
 * What a screen reader gets is one steady heading, "Every home needs a
 * Housemate": the animated spans are aria-hidden and the real second line is
 * visually hidden next to them. The loop runs past five seconds with no way to
 * pause it, which is a known exception to D-037 (WCAG 2.2.2) that the user
 * approved on the board; `prefers-reduced-motion` still holds it on the first
 * phrase and never moves.
 *
 * The slot never changes height, so nothing below it moves as the phrases
 * swap (H4 r3, option A). From md up it is one line and the phrases never
 * wrap; the type is sized so the longest still fits. Below md it is two
 * lines, top-aligned, which every phrase fits at the narrow size. `lh` keeps
 * both in step with whatever size the type resolves to.
 */
export function Hero() {
  return (
    <section className="hm-hero relative flex min-h-[calc(100svh-var(--spacing-bar))] flex-col items-center justify-center bg-evergreen px-6 py-28 lg:px-30 lg:pb-[calc(7rem+var(--spacing-bar))]">
      <div className="flex w-full flex-col items-center">
        <Mark className="h-9 w-auto text-on-evergreen lg:h-14" label={null} />

        {/* Full width, not a column: the longest phrase needs all of it. */}
        <h1 className="mt-9 w-full text-center font-serif text-hero-narrow text-on-evergreen md:text-hero lg:mt-12">
          <span className="block text-on-evergreen/74">{HERO.staticLine}</span>
          <span className="sr-only"> {HERO.phrases[0]}</span>
          <span
            aria-hidden
            className="relative block h-[2lh] overflow-hidden md:h-[1lh]"
            style={{ ["--phrase-count" as string]: HERO.phrases.length }}
          >
            {HERO.phrases.map((phrase, index) => (
              <span
                key={phrase}
                className="hm-phrase absolute inset-x-0 top-0 md:whitespace-nowrap"
                style={{ ["--phrase-index" as string]: index }}
              >
                {phrase}
              </span>
            ))}
          </span>
        </h1>

        {/*
         * `min-h-13` holds the row at the height of a control, so the flip
         * from the button to the bar to the thanks happens in place. Without
         * it the joined state is a 26px line, and everything above it slid up
         * 13px at the moment the member succeeded.
         */}
        <div
          id="waitlist"
          className="mt-11 flex min-h-13 w-full max-w-[440px] scroll-mt-(--spacing-bar) items-center justify-center lg:mt-14"
        >
          <WaitlistForm />
        </div>
      </div>

      {/*
       * Motion F: the cue fades out as soon as the page moves. It has done its
       * job by then, and a cue that keeps pointing down while you scroll reads
       * as an error.
       */}
      {/*
       * A link, not a caption. It carries a label and an arrow and sits at the
       * fold, so it reads as the page's second control — and as a `<p>` it was
       * one that did nothing. It is pinned to the bottom of the first screen
       * rather than hung under the button, where it floated; the section's
       * bottom padding keeps it clear of the button on short screens.
       */}
      <a
        href="#built"
        className="hm-learn-more absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 rounded-md px-3 py-1 text-label text-on-evergreen/74 transition-colors duration-120 ease-out hover:text-on-evergreen focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen),0_0_0_4px_var(--color-canvas)] lg:bottom-8"
      >
        {HERO.learnMore}
        <ArrowDown size={18} aria-hidden />
      </a>
    </section>
  );
}
