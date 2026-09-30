import type { ReactNode } from "react";

type PanelProps = {
  id: string;
  heading: string;
  body: string;
  ground: "canvas" | "nav";
  /**
   * `centered` stacks the copy over a full-width visual. The other two are the
   * alternating wide-screen columns; both stack to copy-then-visual when there
   * is only one column to put them in.
   */
  layout: "centered" | "copy-first" | "visual-first";
  /** The board's widths for the copy, in px. See copy.ts. */
  measure: number;
  column?: number;
  /** Runs the visual to the page's edge and the panel's full height (P4). */
  bleed?: boolean;
  children: ReactNode;
};

/*
 * The shared shell for P1–P6 (the round-4 boards, and N1 for the narrow
 * layout).
 *
 * The copy and the visual sit side by side from xl, not lg. The round-4
 * visuals are wider than the phones they replaced (a 620px browser window,
 * cards that break out of their phone), and at 1024 the space beside a
 * 460px column is too narrow to hold them; below xl they stack instead.
 *
 * Motion B lives here: the copy and the visual fade up 16px as the panel comes
 * into view, the visual 80ms behind the copy, so the panel reads before it is
 * looked at. The rules are in globals.css; both sides opt in by class.
 */
export function Panel({
  id,
  heading,
  body,
  ground,
  layout,
  measure,
  column = measure,
  bleed = false,
  children,
}: PanelProps) {
  const groundClass = ground === "canvas" ? "bg-canvas" : "bg-nav";
  const widths = {
    ["--measure" as string]: `${measure}px`,
    ["--column" as string]: `${column}px`,
  };

  if (layout === "centered") {
    return (
      <section
        id={id}
        aria-labelledby={`${id}-heading`}
        style={widths}
        className={`flex flex-col items-center gap-8 scroll-mt-(--spacing-bar) px-6 py-16 lg:gap-10 lg:px-30 lg:py-24 ${groundClass}`}
      >
        <div className="hm-rise flex max-w-(--measure) flex-col items-center gap-3 text-center lg:gap-3.5">
          <h2
            id={`${id}-heading`}
            className="font-serif text-panel-narrow text-balance text-evergreen lg:text-panel"
          >
            {heading}
          </h2>
          <p
            data-fit-copy
            className="max-w-[576px] text-base text-balance text-body lg:max-w-(--measure) lg:text-lead"
          >
            {body}
          </p>
        </div>
        <div className="hm-rise hm-rise-late w-full max-w-[1080px]">
          {children}
        </div>
      </section>
    );
  }

  const visualFirst = layout === "visual-first";

  // The copy is always first in the DOM, so reading order and tab order follow
  // the words rather than the picture. On wide screens the visual-first panels
  // swap the columns with `order`, which is presentational only.
  //
  // From 1440, the boards' width, the heading and body take the measure rather
  // than the column, so where the measure is wider they run on into the gap
  // beside it and break into full lines as drawn. Narrower than that the gap
  // is too tight to lend them: P5's card would come within a few pixels of
  // its copy at 1280.
  const copy = (
    <div
      className={`hm-rise flex flex-col gap-3 lg:gap-5 xl:w-(--column) xl:shrink-0 ${
        visualFirst ? "xl:order-2" : ""
      } ${bleed ? "xl:self-center xl:py-24" : ""}`}
    >
      <h2
        id={`${id}-heading`}
        className="font-serif text-panel-narrow text-balance text-evergreen lg:text-panel min-[1440px]:w-(--measure)"
      >
        {heading}
      </h2>
      <p
        data-fit-copy
        className="max-w-[576px] text-base text-balance text-body lg:text-lead xl:max-w-none min-[1440px]:w-(--measure)"
      >
        {body}
      </p>
    </div>
  );

  // A bleeding visual cancels the section's side padding while stacked, so
  // it meets both edges of the screen, and fills its whole column once the
  // panel is side by side.
  const visual = (
    <div
      className={`hm-rise hm-rise-late ${
        bleed
          ? "relative -mx-6 lg:-mx-30 xl:mx-0 xl:flex-1 xl:self-stretch"
          : "flex min-w-0 flex-1 justify-center"
      } ${visualFirst ? "xl:order-1" : ""}`}
    >
      {children}
    </div>
  );

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      style={widths}
      className={`flex flex-col gap-8 scroll-mt-(--spacing-bar) px-6 py-16 lg:gap-10 lg:px-30 lg:py-24 xl:flex-row xl:items-center xl:gap-24 ${
        bleed
          ? "pb-0 lg:pb-0 xl:h-[836px] xl:items-stretch xl:py-0 xl:pl-0"
          : ""
      } ${groundClass}`}
    >
      {copy}
      {visual}
    </section>
  );
}
