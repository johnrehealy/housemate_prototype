import Link from "next/link";
import { CLOSE } from "./copy";

const LINKS = [
  { page: "privacy", href: "/privacy", label: "Privacy" },
  { page: "terms", href: "/terms", label: "Terms" },
  { page: "contact", href: "/contact", label: "Contact" },
] as const;

type SitePage = (typeof LINKS)[number]["page"];

/**
 * The evergreen footer under every public page (boards L1–L3; L2 for narrow).
 *
 * Wide, the copyright holds the left edge and the three links the right. On a
 * phone the links come first, where a thumb looks for them, with the copyright
 * under them. The page being read is the one link at full strength.
 */
export function SiteFooter({ current }: { current?: SitePage }) {
  return (
    <footer className="flex flex-col-reverse gap-3 border-t border-on-evergreen/12 bg-evergreen p-6 sm:h-18 sm:flex-row sm:items-center sm:justify-between sm:py-0 lg:px-30">
      <p className="text-xs text-on-evergreen/59">{CLOSE.copyright}</p>
      <nav aria-label="Legal">
        <ul className="flex gap-7">
          {LINKS.map(({ page, href, label }) => (
            <li key={page}>
              <Link
                href={href}
                aria-current={page === current ? "page" : undefined}
                className="rounded-sm text-xs text-on-evergreen/77 transition-colors duration-120 ease-out hover:text-on-evergreen focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen),0_0_0_4px_var(--color-canvas)] aria-[current=page]:text-on-evergreen"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
