import { Nav } from "./_components/nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex h-full">
      <aside className="flex w-(--container-sidebar) shrink-0 flex-col bg-nav">
        <div className="flex h-(--spacing-bar) shrink-0 items-center px-6">
          <span className="text-sm text-evergreen">Housemate</span>
        </div>
        <Nav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <header className="h-(--spacing-bar) shrink-0" />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
