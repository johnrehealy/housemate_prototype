"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINATIONS } from "./destinations";

// Navigation item states from docs/design.md §4. The label stays
// --color-body in every state; ground, border and icon carry the state.
export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-0.5 p-3">
        {DESTINATIONS.map(({ href, label, icon: Icon }) => {
          const selected = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={selected ? "page" : undefined}
                className={`flex h-(--spacing-nav-h) items-center gap-3 rounded-md border px-[11px] text-label text-body transition-colors duration-120 ease-out ${
                  selected
                    ? "border-line bg-canvas shadow-selected"
                    : "border-transparent hover:bg-nav-hover"
                }`}
              >
                <Icon
                  size={20}
                  aria-hidden
                  className={`shrink-0 ${selected ? "text-evergreen" : "text-muted"}`}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
