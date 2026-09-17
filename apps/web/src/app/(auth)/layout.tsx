export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-6 py-16">
      {children}
    </div>
  );
}
