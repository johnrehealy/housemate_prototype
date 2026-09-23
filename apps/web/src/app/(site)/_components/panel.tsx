import type { ReactNode } from "react";

type PanelProps = {
  id: string;
  heading: string;
  body: string;
  ground: "canvas" | "nav";
  /**
   * `centered` stacks the copy over a full-width visual. The other two are the
   * alternating desktop columns; both stack to copy-then-visual when there is
   * only one column to put them in.
   */
  layout: "centered" | "copy-first" | "visual-first";
  /** Extra classes for the section, e.g. the hook the ribbon times itself by. */
  className?: string;
  children: ReactNode;
};

/*
 * The shared shell for P1–P6 (boards, and N1 for the narrow layout).
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
  className = "",
  children,
}: PanelProps) {
  const groundClass = ground === "canvas" ? "bg-canvas" : "bg-nav";

  if (layout === "centered") {
    return (
      <section
        id={id}
        aria-labelledby={`${id}-heading`}
        className={`flex flex-col items-center gap-8 scroll-mt-(--spacing-bar) px-6 py-16 lg:px-30 lg:py-24 ${groundClass} ${className}`}
      >
        <div className="hm-rise flex max-w-[720px] flex-col items-center gap-3 text-center">
          <h2
            id={`${id}-heading`}
            className="font-serif text-panel-narrow text-heading lg:text-panel"
          >
            {heading}
          </h2>
          <p className="text-base text-pretty text-body lg:text-lead">{body}</p>
        </div>
        <div className="hm-rise hm-rise-late w-full max-w-[1080px]">
          {children}
        </div>
      </section>
    );
  }

  // The copy is always first in the DOM, so reading order and tab order follow
  // the words rather than the picture. On wide screens the visual-first panels
  // swap the columns with `order`, which is presentational only.
  const copy = (
    <div
      className={`hm-rise flex flex-col gap-3 lg:w-[420px] lg:shrink-0 ${
        layout === "visual-first" ? "lg:order-2" : ""
      }`}
    >
      <h2
        id={`${id}-heading`}
        className="font-serif text-panel-narrow text-heading lg:text-panel"
      >
        {heading}
      </h2>
      <p className="text-base text-pretty text-body lg:text-lead">{body}</p>
    </div>
  );

  const visual = (
    <div
      className={`hm-rise hm-rise-late flex min-w-0 flex-1 justify-center ${
        layout === "visual-first" ? "lg:order-1" : ""
      }`}
    >
      {children}
    </div>
  );

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`flex flex-col gap-8 scroll-mt-(--spacing-bar) px-6 py-16 lg:flex-row lg:items-center lg:gap-24 lg:px-30 lg:py-24 ${groundClass} ${className}`}
    >
      {copy}
      {visual}
    </section>
  );
}
