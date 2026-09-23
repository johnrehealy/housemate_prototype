import Link from "next/link";
import { Wordmark } from "@/components/brand";

/*
 * The evergreen bar. The boards draw it on every panel so the panels can be
 * read on their own; in the page it is one sticky bar (motion A on board M1).
 */
export function Ribbon() {
  return (
    <header className="sticky top-0 z-50 flex h-(--spacing-bar) items-center justify-between bg-evergreen px-6 lg:px-30">
      <Link
        href="/"
        aria-label="Housemate"
        className="rounded-md focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen),0_0_0_4px_var(--color-canvas)]"
      >
        <Wordmark className="h-5 w-auto text-on-evergreen" label={null} />
      </Link>
      <nav aria-label="Site" className="flex items-center gap-2.5">
        <Link
          href="/sign-in"
          className="flex h-9 items-center justify-center rounded-md border border-on-evergreen/42 px-4 text-label text-on-evergreen transition-colors duration-120 ease-out hover:border-on-evergreen focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen),0_0_0_4px_var(--color-canvas)] sm:w-[150px] sm:px-0"
        >
          Sign in
        </Link>
        {/*
         * The hero owns the waitlist, so this is a link to it rather than a
         * second form. At narrow widths the hero is a screen away, not a page
         * away, which is why it's dropped there: the boards put one call to
         * action on screen at a time.
         */}
        <a
          href="#waitlist"
          className="hm-ribbon-late hidden h-9 items-center justify-center rounded-md bg-canvas px-4 text-label font-bold text-evergreen transition-opacity duration-120 ease-out hover:opacity-90 focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen),0_0_0_4px_var(--color-canvas)] sm:flex sm:w-[150px] sm:px-0"
        >
          Join the waitlist
        </a>
      </nav>
    </header>
  );
}
