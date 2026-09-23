import { ArrowUp } from "@phosphor-icons/react/dist/ssr";

/**
 * P1's visual: the frame the demo video will sit in, with the composer that
 * starts every request drawn on top of it.
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
        className="mx-6 flex min-h-16 w-[600px] max-w-full items-center gap-3.5 rounded-[32px] border border-line bg-surface py-3 pr-2.5 pl-[22px] shadow-[0_1px_3px_#14342F0D]"
      >
        {/* Never truncated: a request cut off mid-word reads as a bug, not as
            a long request. It wraps instead. */}
        <span className="min-w-0 flex-1 text-lead text-heading">
          Book the HVAC tune-up before it gets cold
        </span>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-evergreen">
          <ArrowUp size={20} className="text-on-evergreen" />
        </span>
      </div>
      <p className="absolute bottom-6 left-7 text-xs text-muted">
        Demo video · to be recorded
      </p>
    </div>
  );
}
