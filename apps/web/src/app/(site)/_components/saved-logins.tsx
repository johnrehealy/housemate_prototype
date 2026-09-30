import { CreditCard, Lock, X } from "@phosphor-icons/react/dist/ssr";

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

/**
 * P6's visual: the vault, drawn as the member sees it, floating on its own.
 *
 * The one-time card is what the panel points at, so it lifts off the vault,
 * down and to the right. It is nudged with relative offsets, which leave the
 * layout alone: the overhang lands in the panel's padding, not on the copy.
 */
export function SavedLogins() {
  return (
    <div
      aria-hidden
      className="w-full max-w-[540px] rounded-[22px] border border-line bg-surface shadow-[0_48px_96px_-36px_rgba(20,52,47,0.30),0_2px_8px_rgba(20,52,47,0.05)]"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <p className="text-[20px] leading-7 tracking-[-0.01em] text-heading">
          Saved logins
        </p>
        <X size={18} className="text-muted" />
      </div>

      <div className="flex flex-col px-6 py-2">
        {LOGINS.map((login) => (
          // The chip drops onto its own line below `sm`. Kept on one row it
          // wins the space and squeezes the vendor down to "Water …", which
          // loses the panel's whole point.
          <div
            key={login.name}
            className="flex min-h-16 items-center gap-3.5 border-b border-line py-2.5"
          >
            <Lock size={20} className="shrink-0 text-evergreen" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3.5">
              <div className="flex min-w-0 flex-col gap-0.5 sm:flex-1">
                <p className="truncate text-label leading-[22px] text-heading">
                  {login.name}
                </p>
                <p className="truncate text-xs text-muted">{login.account}</p>
              </div>
              {/* Dots, not a masked value: there is nothing here to reveal. */}
              <span className="hidden w-24 shrink-0 text-label leading-[22px] tracking-[0.04em] text-muted sm:block">
                ••••••••
              </span>
              <span className="flex h-6 w-fit shrink-0 items-center rounded-full bg-status-progress-bg px-2.5 text-2xs text-status-progress-fg">
                Hidden from Housemate
              </span>
            </div>
          </div>
        ))}

        <div className="relative top-6 left-3 flex min-h-21 items-center gap-3.5 rounded-[18px] border border-line bg-surface px-5 py-3 shadow-lift xl:top-11 xl:left-14">
          <CreditCard size={20} className="shrink-0 text-evergreen" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-label leading-[22px] text-heading">
              Card for this purchase
            </p>
            <p className="text-xs text-muted">
              One charge only, up to $89. Your real card stays private.
            </p>
          </div>
          <span className="shrink-0 text-label leading-[22px] tracking-[0.04em] text-muted">
            •••• 4417
          </span>
        </div>
      </div>
    </div>
  );
}
