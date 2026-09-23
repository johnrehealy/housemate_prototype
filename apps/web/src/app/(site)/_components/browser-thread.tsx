import {
  ArrowUpRight,
  CheckCircle,
  Globe,
  LockSimple,
} from "@phosphor-icons/react/dist/ssr";
import {
  Bubble,
  Composer,
  Phone,
  PhoneContact,
  Thread,
  Timestamp,
} from "./phone";

/*
 * The slots the agent is choosing between. The vendor is an example.com
 * address on purpose: no real company is named anywhere on this page, and a
 * plausible-looking domain would be a claim about a partner we don't have.
 */
const SLOTS = [
  { when: "Tue · 8:00 AM", note: "Full", chosen: false },
  { when: "Wed · 9:30 AM", note: null, chosen: true },
  { when: "Thu · 11:00 AM", note: "$89", chosen: false },
] as const;

/** P3's visual: the browser card the agent posts into the thread as it works. */
export function BrowserThread() {
  return (
    <Phone>
      <PhoneContact />
      <Thread>
        <Timestamp>Today 9:04 AM</Timestamp>
        <Bubble from="member">
          Can you get the HVAC tune-up booked for a morning this week?
        </Bubble>
        <Bubble from="housemate">
          On it. I&rsquo;ll compare a few local companies and hold the best
          morning slot.
        </Bubble>

        <span className="w-[250px] self-start overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_3px_#14342F0D]">
          <span className="flex items-center gap-2 px-3 pt-3 pb-2.5">
            <Globe size={16} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-heading">
                Browser
              </span>
              <span className="block text-2xs text-muted">
                Choosing a time…
              </span>
            </span>
            {/* The working light. `hm-browser-pulse` is the only motion inside
                a phone; it is what makes the card read as live rather than a
                screenshot of a finished run. */}
            <span className="hm-browser-pulse size-1.5 shrink-0 rounded-full bg-evergreen" />
          </span>

          <span className="flex flex-col gap-1.5 px-3 pb-3">
            <span className="flex h-7 items-center gap-1.5 rounded-md bg-nav px-2.5">
              <LockSimple size={11} className="shrink-0 text-muted" />
              <span className="truncate text-2xs text-muted">
                hvac-service.example.com
              </span>
            </span>
            {SLOTS.map((slot) => (
              <span
                key={slot.when}
                className={
                  slot.chosen
                    ? "flex h-8 items-center justify-between rounded-md border border-evergreen bg-surface px-2.5"
                    : "flex h-7 items-center justify-between rounded-md bg-nav px-2.5"
                }
              >
                <span className="text-2xs text-heading">{slot.when}</span>
                {slot.chosen ? (
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="text-evergreen"
                  />
                ) : (
                  <span className="text-2xs text-muted">{slot.note}</span>
                )}
              </span>
            ))}
          </span>

          <span className="flex h-10 items-center justify-center gap-1.5 border-t border-line text-xs font-bold text-heading">
            Open browser
            <ArrowUpRight size={13} />
          </span>
        </span>
      </Thread>
      <Composer />
    </Phone>
  );
}
