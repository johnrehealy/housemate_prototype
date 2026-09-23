import Image from "next/image";
import { Package } from "@phosphor-icons/react/dist/ssr";

/**
 * P4's visual: the local team at a member's door.
 *
 * This is the one photograph on the page that is content rather than
 * decoration, so it carries real alt text. The chip on top of it is the
 * visit it belongs to, and is decorative — the alt text already says what is
 * happening.
 */
export function TeamPhoto() {
  return (
    <div className="relative w-full overflow-hidden rounded-[20px]">
      <Image
        src="/site/team-drop-off.png"
        alt="A Housemate team member setting a package down at a member's front door."
        width={1448}
        height={1086}
        sizes="(min-width: 1024px) 684px, 100vw"
        className="aspect-square w-full object-cover"
      />
      <p
        aria-hidden
        className="absolute bottom-6 left-6 flex h-10 items-center gap-2.5 rounded-lg bg-canvas px-3.5 text-label text-heading shadow-[0_2px_8px_rgba(20,52,47,0.16)]"
      >
        <Package size={18} className="shrink-0 text-muted" />
        Monday visit · 2 pickups, 1 drop-off
      </p>
    </div>
  );
}
