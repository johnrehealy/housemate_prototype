import { Check, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { Mark } from "@/components/brand";

/*
 * The slots the agent is choosing between. The vendor is an example.com
 * address on purpose: no real company is named anywhere on this page, and a
 * plausible-looking domain would be a claim about a partner we don't have.
 */
const SLOTS = [
  { when: "Tue · 8:00 AM", note: "Full", state: "full" },
  { when: "Wed · 9:30 AM", note: "$89 visit", state: "chosen" },
  { when: "Thu · 11:00 AM", note: "$89 visit", state: "open" },
] as const;

/**
 * P3's visual: Housemate's own browser at work on a booking page, with the
 * text it sends once it has chosen.
 *
 * The one phone-free panel among the three that show the product, so the page
 * doesn't look at the same picture three times (round-4 note 8). What it calls
 * out is the choice: the chosen slot lifts off the page, wider than the rest.
 *
 * On wide screens the text hangs off the window's lower-left corner, as on the
 * board. Stacked, it tucks under the window's bottom edge instead, which keeps
 * it on screen at every width; the window's page runs longer there to make
 * room for it.
 */
export function BrowserWindow() {
  return (
    <div aria-hidden className="relative w-full max-w-[620px]">
      <div className="flex flex-col overflow-clip rounded-[16px] border border-line-strong bg-surface shadow-float xl:h-[440px]">
        <div className="flex h-[46px] shrink-0 items-center gap-3.5 border-b border-line bg-nav px-4">
          <span className="hidden shrink-0 gap-[7px] sm:flex">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="size-2.5 rounded-full bg-line-strong"
              />
            ))}
          </span>
          <span className="flex h-7 min-w-0 flex-1 items-center gap-[7px] rounded-full border border-line bg-surface px-3">
            <LockSimple size={11} className="shrink-0 text-muted" />
            <span className="truncate text-xs leading-[18px] text-muted">
              hvac-service.example.com
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {/* The working light, the one motion in the picture: it pulses
                twice as the window arrives, so it reads as live rather than
                as a screenshot of a finished run. */}
            <span className="hm-browser-pulse size-[7px] rounded-full bg-evergreen" />
            <span className="text-2xs font-bold text-evergreen">
              Housemate is browsing
            </span>
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-5 px-5 pt-6 pb-14 sm:px-9 sm:pt-8 xl:pb-8">
          <div className="flex flex-col gap-1">
            <p className="text-[22px] leading-7 font-bold tracking-[-0.015em] text-heading">
              Book a tune-up
            </p>
            <p className="text-sm font-normal text-muted">
              Choose an arrival window this week
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {SLOTS.map((slot) =>
              slot.state === "chosen" ? (
                <span
                  key={slot.when}
                  className="-mx-3.5 flex h-15 items-center gap-3 rounded-[14px] border-[1.5px] border-evergreen bg-surface px-5 shadow-lift"
                >
                  <span className="flex-1 text-base leading-[22px] font-bold text-heading">
                    {slot.when}
                  </span>
                  <span className="text-xs leading-[18px] text-body">
                    {slot.note}
                  </span>
                  <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-evergreen">
                    <Check
                      size={12}
                      weight="bold"
                      className="text-on-evergreen"
                    />
                  </span>
                </span>
              ) : (
                <span
                  key={slot.when}
                  className="flex h-13 items-center gap-3 rounded-lg border border-line bg-surface px-[18px]"
                >
                  <span
                    className={`flex-1 text-label leading-[22px] ${
                      slot.state === "full" ? "text-muted" : "text-body"
                    }`}
                  >
                    {slot.when}
                  </span>
                  <span className="text-xs leading-[18px] text-muted">
                    {slot.note}
                  </span>
                </span>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="relative mx-3 -mt-10 flex items-start gap-3 rounded-[20px] border border-line bg-surface pt-3.5 pr-[18px] pb-4 pl-3.5 shadow-lift sm:mr-auto sm:-ml-3 sm:w-[372px] xl:absolute xl:top-[368px] xl:-left-9 xl:m-0">
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-evergreen">
          <Mark className="h-[11px] w-auto text-on-evergreen" label={null} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline justify-between">
            <span className="text-sm text-heading">Housemate</span>
            <span className="text-2xs text-muted">now</span>
          </span>
          <span className="text-sm font-normal text-body">
            Found three openings. Holding Wednesday at 9:30, the best reviewed
            of the three.
          </span>
        </span>
      </div>
    </div>
  );
}
