export default function AuthLayout({ children }: LayoutProps<"/">) {
  // Sign-in owns its frame (docs/design.md §4 Sign-in page, D-073), so this
  // layout only guarantees the full height it stretches into.
  return <div className="flex min-h-full bg-canvas">{children}</div>;
}
