import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { requireStaff } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { template: "%s · Ops · Housemate", default: "Ops · Housemate" },
  robots: { index: false },
};

/** Content width on the approved boards (Paper, page "Ops"). */
const COLUMN = "mx-auto w-full max-w-[1124px]";

function initials(first: string, last: string | null): string {
  return `${first.charAt(0)}${last?.charAt(0) ?? ""}`.toUpperCase();
}

/**
 * The staff-only shell: no member sidebar, a utility bar that says whose view
 * this is, and a tab ribbon. Costs is the only tab until the errand-visit side
 * of ops (D-027) arrives.
 */
export default async function OpsLayout({ children }: LayoutProps<"/ops">) {
  // For the initials. Each page checks again: a layout doesn't stop nested
  // segments from rendering.
  const staff = await requireStaff();
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(" ");

  return (
    <div className="min-h-full bg-canvas">
      <header className="h-(--spacing-bar) border-b border-line px-6">
        <div className={`${COLUMN} flex h-full items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Wordmark className="h-5 w-auto text-evergreen" />
            <span aria-hidden className="h-4 w-px bg-line-strong" />
            <span className="text-label text-muted">Ops</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted">Staff</span>
            <span className="flex size-(--spacing-icon-lg) items-center justify-center rounded-full bg-evergreen text-2xs font-bold text-on-evergreen">
              <span aria-hidden>
                {initials(staff.firstName, staff.lastName)}
              </span>
              <span className="sr-only">Signed in as {name}</span>
            </span>
          </div>
        </div>
      </header>
      <nav aria-label="Ops" className="border-b border-line px-6">
        <ul
          className={`${COLUMN} flex h-[calc(var(--spacing-tabbar)-1px)] gap-7.5`}
        >
          <li className="h-full">
            <Link
              href="/ops/costs"
              aria-current="page"
              className="flex h-full flex-col justify-between pt-4 text-label text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
            >
              Costs
              <span aria-hidden className="h-0.5 bg-evergreen" />
            </Link>
          </li>
        </ul>
      </nav>
      <main className="px-6">
        <div className={COLUMN}>{children}</div>
      </main>
    </div>
  );
}
