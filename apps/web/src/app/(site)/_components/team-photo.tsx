import Image from "next/image";
import { Package } from "@phosphor-icons/react/dist/ssr";

/**
 * P4's visual: the local team at a member's door.
 *
 * This is the one photograph on the page that is content rather than
 * decoration, so it carries real alt text. The chip on top of it is the
 * visit it belongs to, and is decorative — the alt text already says what is
 * happening.
 *
 * It bleeds (see `Panel`): the full width of the screen when stacked, and the
 * panel's whole height from the page's left edge once side by side, where the
 * chip hangs over the photo's right edge into the gap beside the copy.
 * Stacked, the photo ends at the panel's bottom edge, so it clips the chip's
 * shadow rather than letting it fall on the next panel.
 */
export function TeamPhoto() {
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-line-strong sm:aspect-[3/2] xl:aspect-auto xl:h-full xl:overflow-visible">
      <Image
        src="/site/team-drop-off.png"
        alt="A Housemate team member setting a package down at a member's front door."
        fill
        sizes="(min-width: 1280px) 60vw, 100vw"
        className="object-cover"
      />
      <p
        aria-hidden
        className="absolute bottom-6 left-6 flex min-h-15 max-w-[calc(100%-48px)] items-center gap-3 rounded-[16px] border border-line bg-surface px-5 py-2 text-label leading-[22px] text-heading shadow-lift xl:bottom-18 xl:left-auto xl:-right-14 xl:max-w-none"
      >
        <Package size={18} className="shrink-0 text-evergreen" />
        Monday visit · 2 pickups, 1 drop-off
      </p>
    </div>
  );
}
