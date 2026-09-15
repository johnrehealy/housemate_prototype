// Temporary content until each destination's slice delivers it.
export function Placeholder({ area }: { area: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-xs text-muted">{area} arrives in a later slice.</p>
    </div>
  );
}
