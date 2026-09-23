export default function AuthLayout({ children }: LayoutProps<"/">) {
  // The sign-in page owns its own frame at every width (docs/design.md §4,
  // D-036 and D-056), so this layout only guarantees the full height it
  // stretches into.
  return <div className="flex min-h-full bg-canvas">{children}</div>;
}
