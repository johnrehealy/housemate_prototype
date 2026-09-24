import { ArrowUp } from "@phosphor-icons/react/dist/ssr";

/**
 * P1's visual: the frame the demo video will sit in, with the composer that
 * starts every request lifted off it — the one thing the panel points at.
 *
 * The caption is not a placeholder to be quietly removed — it is the honest
 * label for an empty frame, and it stays until there is a recording to put
 * here (HOU-53). Shipping a play button over nothing would promise a video
 * that doesn't exist.
 */
export function DemoFrame() {
  return (
    // 2:1 is the board's frame. Below `lg` it opens up, because the composer
    // wraps to two lines there and a 2:1 frame leaves it nothing to sit in.
    <div className="relative flex aspect-4/3 w-full items-center justify-center rounded-[20px] bg-nav lg:aspect-2/1">
      <div
        aria-hidden
        className="mx-6 flex min-h-16 w-[600px] max-w-full items-center gap-3.5 rounded-[32px] border border-line bg-surface py-2.5 pr-2.5 pl-[22px] shadow-lift"
      >
        {/* Never truncated: a request cut off mid-word reads as a bug, not as
            a long request. It wraps instead. */}
        <span className="min-w-0 flex-1 text-lead text-heading lg:text-[19px]">
          Book the HVAC tune-up before it gets cold
        </span>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-evergreen">
          <ArrowUp size={22} className="text-on-evergreen" />
        </span>
      </div>
      <p className="absolute bottom-6 left-7 text-xs text-muted">
        Demo video · to be recorded
      </p>
    </div>
  );
}
