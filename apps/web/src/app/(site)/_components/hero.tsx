import { ArrowDown } from "@phosphor-icons/react/dist/ssr";
import { Mark } from "@/components/brand";
import { WaitlistForm } from "../waitlist-form";
import { HERO } from "./copy";

/**
 * The hero (boards H3 → H1 → H2, rotation spec H4).
 *
 * The rotating line is CSS only. Each phrase is its own span on the same
 * stacking slot, and `--phrase-count` staggers them, so nothing here runs
 * JavaScript, re-renders, or differs between the server and the first paint.
 *
 * What a screen reader gets is one steady heading, "Every home needs a
 * Housemate.": the animated spans are aria-hidden and the real second line is
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
    <section className="flex min-h-[calc(100svh-var(--spacing-bar))] flex-col items-center justify-center bg-evergreen px-6 pt-16 pb-12 lg:px-30">
      <div className="flex w-full flex-col items-center">
        <Mark
          className="h-10 w-auto text-on-evergreen lg:h-[69px]"
          label={null}
        />

        {/* Full width, not a column: the longest phrase needs all of it. */}
        <h1 className="mt-7 w-full text-center font-serif text-hero-narrow text-on-evergreen md:text-hero">
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
          className="mt-9 flex min-h-13 w-full max-w-[440px] scroll-mt-(--spacing-bar) items-center justify-center"
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
       * one that did nothing.
       */}
      <a
        href="#built"
        className="hm-learn-more mt-16 flex flex-col items-center gap-1.5 rounded-md px-3 py-1 text-xs text-on-evergreen/62 transition-colors duration-120 ease-out hover:text-on-evergreen focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen),0_0_0_4px_var(--color-canvas)]"
      >
        {HERO.learnMore}
        <ArrowDown size={18} aria-hidden />
      </a>
    </section>
  );
}
