import { Wordmark } from "@/components/brand";
import { requireMember } from "@/lib/auth/session";
import { signOut } from "./actions";
import { Nav } from "./_components/nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // The shell shows who is signed in, so it needs the member. Each page checks
  // again: a layout doesn't stop nested segments from rendering.
  const member = await requireMember();

  return (
    <div className="flex h-full">
      <aside className="flex w-(--container-sidebar) shrink-0 flex-col bg-nav">
        <div className="flex h-(--spacing-bar) shrink-0 items-center px-6">
          <Wordmark className="h-5 w-auto text-evergreen" />
        </div>
        <Nav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        {/* What belongs in the utility bar isn't specified yet (docs/design.md
            §7), so it carries only who is signed in and a way out. */}
        <header className="flex h-(--spacing-bar) shrink-0 items-center justify-end gap-4 px-7">
          <span className="text-xs text-muted">{member.firstName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="h-(--spacing-hit) rounded-md px-3 text-xs text-muted transition-colors duration-120 ease-out hover:bg-nav-hover hover:text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
            >
              Sign out
            </button>
          </form>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
