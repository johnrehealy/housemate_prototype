import { CreditCard, LockSimple, X } from "@phosphor-icons/react/dist/ssr";

/*
 * Generic vendors and an example.com address. D-062 is the decision this
 * panel illustrates: the logins are filled into the browser sandbox by worker
 * code, so "Hidden from Housemate" means hidden from the agent's model, which
 * is exactly what the chip says.
 */
const LOGINS = [
  { name: "Water utility", account: "sam@example.com" },
  { name: "Internet provider", account: "sam@example.com" },
] as const;

/** P6's visual: the vault, drawn as the member sees it. */
export function SavedLogins() {
  return (
    <div
      aria-hidden
      // The 4:3 frame is the board's. Below `lg` the rows are taller, so the
      // modal sets the height instead of being clipped by a fixed ratio.
      className="flex w-full items-center justify-center rounded-[20px] bg-canvas px-6 py-10 lg:aspect-4/3 lg:py-0"
    >
      <div className="w-full max-w-[558px] overflow-hidden rounded-xl bg-surface shadow-[0_8px_28px_rgba(20,52,47,0.10)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="text-lead text-heading">Saved logins</p>
          <X size={18} className="text-muted" />
        </div>

        {LOGINS.map((login) => (
          // The chip drops onto its own line below `sm`. Kept on one row it
          // wins the space and squeezes the vendor down to "Water …", which
          // loses the panel's whole point.
          <div
            key={login.name}
            className="flex items-start gap-3.5 border-b border-line px-5 py-3.5 sm:items-center"
          >
            <LockSimple
              size={18}
              className="mt-0.5 shrink-0 text-muted sm:mt-0"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3.5">
              <div className="min-w-0 sm:flex-1">
                <p className="truncate text-label text-heading">{login.name}</p>
                <p className="truncate text-xs text-muted">{login.account}</p>
              </div>
              {/* Dots, not a masked value: there is nothing here to reveal. */}
              <span className="hidden shrink-0 tracking-[0.18em] text-heading sm:block">
                ••••••••
              </span>
              <span className="w-fit shrink-0 rounded-full bg-status-progress-bg px-2.5 py-1 text-2xs text-status-progress-fg">
                Hidden from Housemate
              </span>
            </div>
          </div>
        ))}

        <div className="flex items-start gap-3.5 px-5 py-3.5 sm:items-center">
          <CreditCard
            size={18}
            className="mt-0.5 shrink-0 text-muted sm:mt-0"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3.5">
            <div className="min-w-0 sm:flex-1">
              <p className="text-label text-heading">Card for this purchase</p>
              <p className="text-xs text-muted">
                One charge only, up to $89. Your real card stays private.
              </p>
            </div>
            <span className="shrink-0 text-label text-muted">
              <span className="tracking-[0.18em]">••••</span> 4417
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
